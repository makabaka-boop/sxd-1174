from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, case
from datetime import datetime, date, timedelta
from typing import Optional, List
import models, schemas, auth
from database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="入场手环管理平台 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    auth.init_default_user(db)
    _init_basic_data(db)
    db.close()


def _init_basic_data(db: Session):
    colors = [
        ("红色", "#DC2626", "VIP嘉宾", ""),
        ("蓝色", "#2563EB", "普通参会者", ""),
        ("绿色", "#16A34A", "工作人员", ""),
        ("黄色", "#CA8A04", "媒体记者", ""),
        ("紫色", "#9333EA", "特邀嘉宾", ""),
        ("橙色", "#EA580C", "志愿者", ""),
    ]
    for c in colors:
        if not db.query(models.ColorRule).filter(models.ColorRule.color == c[0]).first():
            db.add(models.ColorRule(color=c[0], color_hex=c[1], meaning=c[2], applicable_batches=c[3]))
    db.commit()

    cabinets = [("A-01", "主入口左侧柜", 200), ("A-02", "主入口右侧柜", 200), ("B-01", "次入口柜", 150), ("C-01", "VIP通道柜", 100)]
    for code, loc, cap in cabinets:
        if not db.query(models.Cabinet).filter(models.Cabinet.code == code).first():
            db.add(models.Cabinet(code=code, location=loc, capacity=cap))
    db.commit()

    persons = [("张三", "13800138001", "运营部", "主管"), ("李四", "13800138002", "运营部", "专员"), ("王五", "13800138003", "安保部", "主管")]
    for name, phone, dept, pos in persons:
        if not db.query(models.ResponsiblePerson).filter(models.ResponsiblePerson.name == name).first():
            db.add(models.ResponsiblePerson(name=name, phone=phone, department=dept, position=pos))
    db.commit()


@app.get("/")
def root():
    return {"message": "入场手环管理平台 API", "status": "running"}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or not auth.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name
    }


@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.get("/api/color-rules", response_model=List[schemas.ColorRuleResponse])
def list_color_rules(db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    return db.query(models.ColorRule).all()


@app.post("/api/color-rules", response_model=schemas.ColorRuleResponse)
def create_color_rule(data: schemas.ColorRuleCreate, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    if db.query(models.ColorRule).filter(models.ColorRule.color == data.color).first():
        raise HTTPException(status_code=400, detail="颜色规则已存在")
    rule = models.ColorRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@app.get("/api/cabinets", response_model=List[schemas.CabinetResponse])
def list_cabinets(db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    return db.query(models.Cabinet).all()


@app.post("/api/cabinets", response_model=schemas.CabinetResponse)
def create_cabinet(data: schemas.CabinetCreate, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    if db.query(models.Cabinet).filter(models.Cabinet.code == data.code).first():
        raise HTTPException(status_code=400, detail="柜位编号已存在")
    c = models.Cabinet(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@app.get("/api/responsible-persons", response_model=List[schemas.ResponsiblePersonResponse])
def list_responsible_persons(db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    return db.query(models.ResponsiblePerson).all()


@app.post("/api/responsible-persons", response_model=schemas.ResponsiblePersonResponse)
def create_responsible_person(data: schemas.ResponsiblePersonCreate, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    p = models.ResponsiblePerson(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@app.get("/api/batches", response_model=List[schemas.BatchResponse])
def list_batches(db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    batches = db.query(models.Batch).all()
    result = []
    for b in batches:
        resp = schemas.BatchResponse.model_validate(b)
        resp.wristband_count = db.query(func.count(models.Wristband.id)).filter(models.Wristband.batch_id == b.id).scalar()
        result.append(resp)
    return result


@app.post("/api/batches", response_model=schemas.BatchResponse)
def create_batch(data: schemas.BatchCreate, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    if db.query(models.Batch).filter(models.Batch.batch_code == data.batch_code).first():
        raise HTTPException(status_code=400, detail="批次编号已存在")
    b = models.Batch(**data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@app.get("/api/batches/{batch_id}", response_model=schemas.BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    b = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="批次不存在")
    resp = schemas.BatchResponse.model_validate(b)
    resp.wristband_count = db.query(func.count(models.Wristband.id)).filter(models.Wristband.batch_id == b.id).scalar()
    return resp


@app.put("/api/batches/{batch_id}", response_model=schemas.BatchResponse)
def update_batch(batch_id: int, data: schemas.BatchUpdate, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    b = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="批次不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b


@app.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    b = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="批次不存在")
    wb_count = db.query(func.count(models.Wristband.id)).filter(models.Wristband.batch_id == batch_id).scalar()
    if wb_count > 0:
        raise HTTPException(status_code=400, detail="批次下存在手环，无法删除")
    db.delete(b)
    db.commit()
    return {"message": "删除成功"}


@app.post("/api/wristbands/import")
def import_wristbands(data: schemas.WristbandImport, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    batch = db.query(models.Batch).filter(models.Batch.id == data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if batch.color_rule_id:
        color_rule = db.query(models.ColorRule).filter(models.ColorRule.id == batch.color_rule_id).first()
        if color_rule and color_rule.color != data.color:
            raise HTTPException(status_code=400, detail=f"颜色规则不匹配：批次指定颜色为「{color_rule.color}」，当前导入颜色为「{data.color}」")

    start_num = _extract_number(data.start_serial)
    prefix = _extract_prefix(data.start_serial)

    imported = 0
    count = data.count if data.count else 1

    for i in range(count):
        serial = f"{prefix}{start_num + i:06d}" if start_num is not None else f"{data.start_serial}-{i+1:04d}"
        if db.query(models.Wristband).filter(models.Wristband.serial_number == serial).first():
            continue
        wb = models.Wristband(
            serial_number=serial,
            batch_id=data.batch_id,
            color=data.color,
            cabinet_id=data.cabinet_id or batch.cabinet_id,
            responsible_person_id=data.responsible_person_id or batch.responsible_person_id,
            expected_return_date=data.expected_return_date,
            status="待发放"
        )
        db.add(wb)
        imported += 1

    batch.total_quantity += imported
    db.commit()
    return {"imported": imported, "batch_total": batch.total_quantity}


def _extract_number(s: str):
    num_str = "".join([c for c in s if c.isdigit()])
    return int(num_str) if num_str else None


def _extract_prefix(s: str):
    return "".join([c for c in s if not c.isdigit()]) or "WB"


@app.get("/api/wristbands")
def list_wristbands(
    batch_id: Optional[int] = None,
    batch_code: Optional[str] = None,
    color: Optional[str] = None,
    responsible_person_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    abnormal_only: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(auth.get_current_user)
):
    query = db.query(models.Wristband).join(models.Batch, models.Wristband.batch_id == models.Batch.id, isouter=True)

    if batch_id:
        query = query.filter(models.Wristband.batch_id == batch_id)
    if batch_code:
        query = query.filter(models.Batch.batch_code.contains(batch_code))
    if color:
        query = query.filter(models.Wristband.color == color)
    if responsible_person_id:
        query = query.filter(models.Wristband.responsible_person_id == responsible_person_id)
    if status:
        query = query.filter(models.Wristband.status == status)
    if abnormal_only:
        query = query.filter(models.Wristband.abnormal_flag == True)
    if search:
        query = query.filter(or_(
            models.Wristband.serial_number.contains(search),
            models.Wristband.recipient_name.contains(search),
            models.Wristband.recipient_phone.contains(search)
        ))
    if date_from:
        query = query.filter(models.Wristband.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(models.Wristband.created_at <= datetime.combine(date_to, datetime.max.time()))

    total = query.count()
    items = query.order_by(models.Wristband.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for wb in items:
        resp = schemas.WristbandResponse.model_validate(wb)
        if wb.batch:
            resp.batch_code = wb.batch.batch_code
            resp.batch_name = wb.batch.name
        if wb.cabinet:
            resp.cabinet_code = wb.cabinet.code
        if wb.responsible_person:
            resp.responsible_person_name = wb.responsible_person.name
        result.append(resp)

    return {"total": total, "page": page, "page_size": page_size, "items": result}


@app.post("/api/wristbands/issue")
def issue_wristband(data: schemas.IssueWristbandRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    wb = db.query(models.Wristband).filter(models.Wristband.serial_number == data.serial_number).first()
    if not wb:
        raise HTTPException(status_code=404, detail="手环不存在")

    if wb.status == "已发放":
        raise HTTPException(status_code=400, detail="该手环已发放，不能重复发放")
    if wb.status == "异常观察":
        raise HTTPException(status_code=400, detail="该手环处于异常观察状态，不得再次入场")
    if wb.status == "停用":
        raise HTTPException(status_code=400, detail="该手环已停用，无法发放")

    batch = db.query(models.Batch).filter(models.Batch.id == wb.batch_id).first()
    if batch and batch.color_rule_id:
        color_rule = db.query(models.ColorRule).filter(models.ColorRule.id == batch.color_rule_id).first()
        if color_rule and color_rule.color != wb.color:
            raise HTTPException(status_code=400, detail=f"颜色与批次规则不匹配：批次要求「{color_rule.color}」，手环为「{wb.color}」")

    now = datetime.utcnow()
    wb.status = "已发放"
    wb.recipient_name = data.recipient_name
    wb.recipient_phone = data.recipient_phone
    wb.recipient_id_card = data.recipient_id_card
    wb.issued_at = now
    wb.expected_return_date = data.expected_return_date
    wb.remark = data.remark

    record = models.IssueRecord(
        wristband_id=wb.id,
        recipient_name=data.recipient_name,
        recipient_phone=data.recipient_phone,
        recipient_id_card=data.recipient_id_card,
        issue_person_id=current_user.id,
        issue_person_name=current_user.full_name or current_user.username,
        issue_location=data.issue_location,
        expected_return_date=data.expected_return_date,
        remark=data.remark,
        issued_at=now
    )
    db.add(record)
    db.commit()
    return {"message": "发放成功", "serial_number": wb.serial_number, "status": wb.status}


@app.post("/api/wristbands/return")
def return_wristband(data: schemas.ReturnWristbandRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    wb = db.query(models.Wristband).filter(models.Wristband.serial_number == data.serial_number).first()
    if not wb:
        raise HTTPException(status_code=404, detail="手环不存在")
    if wb.status not in ["已发放", "异常观察"]:
        raise HTTPException(status_code=400, detail=f"手环当前状态为「{wb.status}」，无法回收")

    now = datetime.utcnow()
    wb.status = "待回收确认"
    wb.returned_at = now

    record = models.ReturnRecord(
        wristband_id=wb.id,
        return_person_id=current_user.id,
        return_person_name=current_user.full_name or current_user.username,
        return_location=data.return_location,
        condition=data.condition,
        remark=data.remark,
        returned_at=now,
        confirmed=False
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "回收提交成功，等待确认", "return_record_id": record.id, "status": wb.status}


@app.post("/api/wristbands/confirm-return")
def confirm_return(data: schemas.ConfirmReturnRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    record = db.query(models.ReturnRecord).filter(models.ReturnRecord.id == data.return_record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="回收记录不存在")
    if record.confirmed:
        raise HTTPException(status_code=400, detail="该回收记录已确认")

    wb = db.query(models.Wristband).filter(models.Wristband.id == record.wristband_id).first()
    if not wb:
        raise HTTPException(status_code=404, detail="关联手环不存在")

    now = datetime.utcnow()
    record.confirmed = True
    record.confirmed_by = current_user.full_name or current_user.username
    record.confirmed_at = now
    if data.remark:
        record.remark = (record.remark or "") + " | 确认备注：" + data.remark

    if record.condition == "损坏" or record.condition == "遗失":
        wb.status = "异常观察"
        wb.abnormal_flag = True
        wb.abnormal_type = f"回收{record.condition}"
        abnormal_desc = f"回收时确认手环{record.condition}"
        if record.remark:
            abnormal_desc += f"。备注：{record.remark}"
        abnormal_record = models.AbnormalRecord(
            wristband_id=wb.id,
            abnormal_type=f"回收{record.condition}",
            description=abnormal_desc,
            missing_explanation=record.remark if record.condition == "遗失" else None,
            reporter_id=current_user.id,
            reporter_name=current_user.full_name or current_user.username,
            reported_at=now,
            handled=False
        )
        db.add(abnormal_record)
    else:
        wb.status = "已回收"
        wb.abnormal_flag = False

    db.commit()
    return {"message": "回收确认完成", "status": wb.status}


@app.post("/api/wristbands/report-abnormal")
def report_abnormal(data: schemas.ReportAbnormalRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    wb = db.query(models.Wristband).filter(models.Wristband.serial_number == data.serial_number).first()
    if not wb:
        raise HTTPException(status_code=404, detail="手环不存在")

    if data.abnormal_type == "遗失" and (not data.missing_explanation or not data.missing_explanation.strip()):
        raise HTTPException(status_code=400, detail="遗失类型必须填写缺失说明")

    now = datetime.utcnow()
    wb.status = "异常观察"
    wb.abnormal_flag = True
    wb.abnormal_type = data.abnormal_type
    if data.missing_explanation:
        wb.remark = (wb.remark or "") + " | 缺失说明：" + data.missing_explanation

    record = models.AbnormalRecord(
        wristband_id=wb.id,
        abnormal_type=data.abnormal_type,
        description=data.description,
        missing_explanation=data.missing_explanation,
        reporter_id=current_user.id,
        reporter_name=current_user.full_name or current_user.username,
        reported_at=now,
        handled=False
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "异常已记录", "abnormal_record_id": record.id, "status": wb.status}


@app.post("/api/wristbands/handle-abnormal")
def handle_abnormal(data: schemas.HandleAbnormalRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    record = db.query(models.AbnormalRecord).filter(models.AbnormalRecord.id == data.abnormal_record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="异常记录不存在")
    if record.handled:
        raise HTTPException(status_code=400, detail="该异常已处理")

    wb = db.query(models.Wristband).filter(models.Wristband.id == record.wristband_id).first()
    now = datetime.utcnow()
    record.handled = True
    record.handler_id = current_user.id
    record.handler_name = current_user.full_name or current_user.username
    record.handled_at = now
    record.handling_result = data.handling_result

    if data.change_status_to:
        valid_statuses = ["待发放", "已发放", "待回收确认", "已回收", "异常观察", "停用"]
        if data.change_status_to not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"无效状态：{data.change_status_to}")
        wb.status = data.change_status_to
        if data.change_status_to != "异常观察":
            wb.abnormal_flag = False

    db.commit()
    return {"message": "异常处理完成", "status": wb.status}


@app.get("/api/wristbands/{serial}", response_model=schemas.WristbandResponse)
def get_wristband(serial: str, db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    wb = db.query(models.Wristband).filter(models.Wristband.serial_number == serial).first()
    if not wb:
        raise HTTPException(status_code=404, detail="手环不存在")
    resp = schemas.WristbandResponse.model_validate(wb)
    if wb.batch:
        resp.batch_code = wb.batch.batch_code
        resp.batch_name = wb.batch.name
    if wb.cabinet:
        resp.cabinet_code = wb.cabinet.code
    if wb.responsible_person:
        resp.responsible_person_name = wb.responsible_person.name
    return resp


@app.get("/api/issue-records", response_model=List[schemas.IssueRecordResponse])
def list_issue_records(
    batch_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(auth.get_current_user)
):
    query = db.query(models.IssueRecord).join(models.Wristband, models.IssueRecord.wristband_id == models.Wristband.id)
    if batch_id:
        query = query.filter(models.Wristband.batch_id == batch_id)
    if date_from:
        query = query.filter(models.IssueRecord.issued_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(models.IssueRecord.issued_at <= datetime.combine(date_to, datetime.max.time()))
    records = query.order_by(models.IssueRecord.issued_at.desc()).limit(200).all()
    result = []
    for r in records:
        resp = schemas.IssueRecordResponse.model_validate(r)
        wb = db.query(models.Wristband).filter(models.Wristband.id == r.wristband_id).first()
        if wb:
            resp.serial_number = wb.serial_number
        result.append(resp)
    return result


@app.get("/api/return-records", response_model=List[schemas.ReturnRecordResponse])
def list_return_records(
    confirmed: Optional[bool] = None,
    db: Session = Depends(get_db),
    _=Depends(auth.get_current_user)
):
    query = db.query(models.ReturnRecord)
    if confirmed is not None:
        query = query.filter(models.ReturnRecord.confirmed == confirmed)
    records = query.order_by(models.ReturnRecord.returned_at.desc()).limit(200).all()
    result = []
    for r in records:
        resp = schemas.ReturnRecordResponse.model_validate(r)
        wb = db.query(models.Wristband).filter(models.Wristband.id == r.wristband_id).first()
        if wb:
            resp.serial_number = wb.serial_number
        result.append(resp)
    return result


@app.get("/api/abnormal-records", response_model=List[schemas.AbnormalRecordResponse])
def list_abnormal_records(
    handled: Optional[bool] = None,
    db: Session = Depends(get_db),
    _=Depends(auth.get_current_user)
):
    query = db.query(models.AbnormalRecord)
    if handled is not None:
        query = query.filter(models.AbnormalRecord.handled == handled)
    records = query.order_by(models.AbnormalRecord.reported_at.desc()).limit(200).all()
    result = []
    for r in records:
        resp = schemas.AbnormalRecordResponse.model_validate(r)
        wb = db.query(models.Wristband).filter(models.Wristband.id == r.wristband_id).first()
        if wb:
            resp.serial_number = wb.serial_number
        result.append(resp)
    return result


@app.get("/api/statistics", response_model=schemas.StatisticsResponse)
def get_statistics(db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    total_batches = db.query(func.count(models.Batch.id)).scalar()
    total_wb = db.query(func.count(models.Wristband.id)).scalar()

    status_counts = dict(db.query(models.Wristband.status, func.count(models.Wristband.id))
                         .group_by(models.Wristband.status).all())

    color_rows = db.query(
        models.Wristband.color,
        func.count(models.Wristband.id)
    ).group_by(models.Wristband.color).all()
    color_map = {c.color: c.color_hex for c in db.query(models.ColorRule).all()}
    color_distribution = []
    for color, cnt in color_rows:
        color_distribution.append(schemas.ColorDistributionItem(
            color=color,
            color_hex=color_map.get(color, "#6B7280"),
            count=cnt,
            percentage=round(cnt / total_wb * 100, 2) if total_wb > 0 else 0
        ))

    today = date.today()
    issued_query = db.query(models.Wristband).filter(models.Wristband.status == "已发放")
    issued_count = issued_query.count()
    returned_timely = 0
    total_returned_in_period = 0
    recovery_trend = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_start = datetime.combine(d, datetime.min.time())
        day_end = datetime.combine(d, datetime.max.time())
        day_issued = db.query(func.count(models.IssueRecord.id)).filter(
            and_(models.IssueRecord.issued_at >= day_start, models.IssueRecord.issued_at <= day_end)
        ).scalar() or 0
        day_returned = db.query(func.count(models.ReturnRecord.id)).filter(
            and_(models.ReturnRecord.returned_at >= day_start, models.ReturnRecord.returned_at <= day_end)
        ).scalar() or 0
        timely = db.query(func.count(models.ReturnRecord.id)).join(
            models.Wristband, models.ReturnRecord.wristband_id == models.Wristband.id
        ).filter(
            and_(
                models.ReturnRecord.returned_at >= day_start,
                models.ReturnRecord.returned_at <= day_end,
                models.Wristband.expected_return_date.isnot(None),
                func.date(models.ReturnRecord.returned_at) <= models.Wristband.expected_return_date
            )
        ).scalar() or 0
        returned_timely += timely
        total_returned_in_period += day_returned
        recovery_trend.append(schemas.RecoveryRateItem(
            date=str(d),
            issued_count=day_issued,
            returned_count=day_returned,
            timely_count=timely,
            timely_rate=round(timely / day_returned * 100, 2) if day_returned > 0 else 0
        ))
    recovery_timely_rate = round(returned_timely / total_returned_in_period * 100, 2) if total_returned_in_period > 0 else 0

    rp_rows = db.query(
        models.ResponsiblePerson.id,
        models.ResponsiblePerson.name,
        func.count(models.Wristband.id).filter(models.Wristband.status == "已发放"),
        func.count(models.Wristband.id).filter(models.Wristband.status == "已回收"),
        func.count(models.Wristband.id).filter(models.Wristband.abnormal_flag == True)
    ).outerjoin(models.Wristband, models.ResponsiblePerson.id == models.Wristband.responsible_person_id
    ).group_by(models.ResponsiblePerson.id).all()
    responsible_load = [schemas.ResponsibleLoadItem(
        person_id=r[0], person_name=r[1], issued_count=r[2] or 0, returned_count=r[3] or 0, abnormal_count=r[4] or 0
    ) for r in rp_rows]

    pending_return_confirm = db.query(func.count(models.ReturnRecord.id)).filter(models.ReturnRecord.confirmed == False).scalar() or 0
    pending_abnormal = db.query(func.count(models.AbnormalRecord.id)).filter(models.AbnormalRecord.handled == False).scalar() or 0
    overdue_return = db.query(func.count(models.Wristband.id)).filter(
        and_(
            models.Wristband.status == "已发放",
            models.Wristband.expected_return_date.isnot(None),
            models.Wristband.expected_return_date < today
        )
    ).scalar() or 0

    pending_items = schemas.PendingItem(
        type="待处理汇总",
        count=pending_return_confirm + pending_abnormal + overdue_return,
        items=[
            {"type": "待回收确认", "count": pending_return_confirm},
            {"type": "待处理异常", "count": pending_abnormal},
            {"type": "逾期未回收", "count": overdue_return},
        ]
    )

    hf_rows = db.query(
        models.Wristband.recipient_name,
        func.count(models.Wristband.id),
        func.group_concat(models.Wristband.serial_number)
    ).filter(
        and_(models.Wristband.recipient_name.isnot(None), models.Wristband.abnormal_flag == True,
             or_(
                 models.Wristband.abnormal_type == "遗失",
                 models.Wristband.abnormal_type.contains("缺失"),
                 models.Wristband.abnormal_type.contains("遗失"),
                 models.Wristband.abnormal_type.contains("损坏"),
             ))
    ).group_by(models.Wristband.recipient_name).having(func.count(models.Wristband.id) >= 2
    ).order_by(func.count(models.Wristband.id).desc()).limit(10).all()
    high_frequency_missing = [schemas.HighFrequencyMissingItem(
        person_name=r[0], count=r[1], serial_numbers=(r[2] or "").split(",")[:10]
    ) for r in hf_rows]

    lag_rows = db.query(models.Wristband).filter(
        and_(
            models.Wristband.status == "已发放",
            models.Wristband.expected_return_date.isnot(None),
            models.Wristband.expected_return_date < today
        )
    ).order_by(models.Wristband.expected_return_date.asc()).limit(20).all()
    recovery_lag = [schemas.RecoveryLagItem(
        serial_number=w.serial_number,
        recipient_name=w.recipient_name,
        expected_return_date=w.expected_return_date,
        days_overdue=(today - w.expected_return_date).days if w.expected_return_date else 0
    ) for w in lag_rows]

    inc_rows = db.query(models.AbnormalRecord).filter(models.AbnormalRecord.handled == False
    ).order_by(models.AbnormalRecord.reported_at.asc()).limit(20).all()
    incomplete_abnormal = []
    for r in inc_rows:
        wb = db.query(models.Wristband).filter(models.Wristband.id == r.wristband_id).first()
        hours = (datetime.utcnow() - r.reported_at).total_seconds() / 3600
        incomplete_abnormal.append(schemas.IncompleteAbnormalItem(
            abnormal_record_id=r.id,
            serial_number=wb.serial_number if wb else "",
            abnormal_type=r.abnormal_type,
            reported_at=r.reported_at,
            hours_pending=round(hours, 1)
        ))

    return schemas.StatisticsResponse(
        total_batches=total_batches,
        total_wristbands=total_wb,
        pending_issue=status_counts.get("待发放", 0),
        issued=status_counts.get("已发放", 0),
        pending_return_confirm=pending_return_confirm,
        returned=status_counts.get("已回收", 0),
        abnormal_observation=status_counts.get("异常观察", 0),
        disabled=status_counts.get("停用", 0),
        color_distribution=color_distribution,
        recovery_timely_rate=recovery_timely_rate,
        recovery_rate_trend=recovery_trend,
        responsible_load=responsible_load,
        pending_items=pending_items,
        high_frequency_missing=high_frequency_missing,
        recovery_lag=recovery_lag,
        incomplete_abnormal=incomplete_abnormal
    )
