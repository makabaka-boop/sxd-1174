
import sys
sys.path.insert(0, '.')
from database import SessionLocal, engine, Base
from models import *
from auth import get_password_hash, init_default_user
from datetime import datetime, timedelta, date

Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("开始创建测试数据...")

try:
    init_default_user(db)
    admin = db.query(User).filter(User.username == 'admin').first()
    print("  - 用户已就绪")

    color_rule = db.query(ColorRule).filter(ColorRule.color == '红色').first()
    if not color_rule:
        color_rule = ColorRule(color='红色', color_hex='#DC2626', meaning='VIP嘉宾')
        db.add(color_rule)
        db.commit()
        db.refresh(color_rule)

    cabinet = db.query(Cabinet).first()
    if not cabinet:
        cabinet = Cabinet(code='A-01', location='主入口左侧柜', capacity=200)
        db.add(cabinet)
        db.commit()
        db.refresh(cabinet)

    rp = db.query(ResponsiblePerson).first()
    if not rp:
        rp = ResponsiblePerson(name='张三', phone='13800138001', department='运营部', position='主管')
        db.add(rp)
        db.commit()
        db.refresh(rp)

    print("  - 基础数据已就绪")

    batch = db.query(Batch).filter(Batch.batch_code == 'TEST-001').first()
    if not batch:
        batch = Batch(
            batch_code='TEST-001',
            name='测试批次 001',
            color_rule_id=color_rule.id if color_rule else None,
            cabinet_id=cabinet.id if cabinet else None,
            responsible_person_id=rp.id if rp else None,
            total_quantity=10,
            event_date=date.today(),
            description='测试用批次',
            status='active'
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        print("  - 创建测试批次")

    wristbands = []
    for i in range(1, 11):
        serial = f'TEST{i:05d}'
        w = db.query(Wristband).filter(Wristband.serial_number == serial).first()
        if not w:
            w = Wristband(
                serial_number=serial,
                color='红色',
                status='待发放',
                batch_id=batch.id,
                cabinet_id=cabinet.id if cabinet else None,
                responsible_person_id=rp.id if rp else None
            )
            db.add(w)
        wristbands.append(w)
    db.commit()
    print("  - 创建10个测试手环")

    w1 = wristbands[0]
    if w1.status == '待发放':
        w1.status = '已发放'
        w1.recipient_name = '李小明'
        w1.recipient_phone = '13900139000'
        w1.issued_at = datetime.now() - timedelta(days=5)
        w1.expected_return_date = date.today() + timedelta(days=2)

        issue = IssueRecord(
            wristband_id=w1.id,
            recipient_name='李小明',
            recipient_phone='13900139000',
            recipient_id_card='110101199001011234',
            issue_person_id=admin.id,
            issue_person_name=admin.full_name,
            issue_location='主入口',
            issued_at=datetime.now() - timedelta(days=5),
            expected_return_date=date.today() + timedelta(days=2),
            remark='VIP客户'
        )
        db.add(issue)
        print("  - 手环 TEST00001 创建发放记录")

    w2 = wristbands[1]
    if w2.status == '待发放':
        issue2 = IssueRecord(
            wristband_id=w2.id,
            recipient_name='王小红',
            recipient_phone='13700137000',
            issue_person_id=admin.id,
            issue_person_name=admin.full_name,
            issue_location='主入口',
            issued_at=datetime.now() - timedelta(days=7),
            expected_return_date=date.today() - timedelta(days=3),
            remark='测试活动'
        )
        db.add(issue2)
        db.commit()

        w2.status = '待发放'
        w2.returned_at = datetime.now() - timedelta(days=4)

        return2 = ReturnRecord(
            wristband_id=w2.id,
            return_person_id=admin.id,
            return_person_name=admin.full_name,
            return_location='主入口',
            returned_at=datetime.now() - timedelta(days=4),
            condition='完好',
            confirmed=True,
            confirmed_by=admin.full_name,
            confirmed_at=datetime.now() - timedelta(days=4),
            remark='正常归还'
        )
        db.add(return2)
        print("  - 手环 TEST00002 创建发放+归还记录")

    w3 = wristbands[2]
    if w3.status == '待发放':
        w3.status = '异常'
        w3.abnormal_flag = True
        w3.abnormal_type = '损坏'

        abnormal = AbnormalRecord(
            wristband_id=w3.id,
            abnormal_type='损坏',
            reporter_id=admin.id,
            reporter_name=admin.full_name,
            reported_at=datetime.now() - timedelta(days=1),
            handled=False,
            description='手环屏幕损坏，无法显示'
        )
        db.add(abnormal)
        print("  - 手环 TEST00003 创建异常记录")

    w4 = wristbands[3]
    transfer = db.query(WristbandTransfer).filter(WristbandTransfer.transfer_code == 'TR-TEST-001').first()
    if not transfer:
        transfer = WristbandTransfer(
            transfer_code='TR-TEST-001',
            wristband_id=w4.id,
            serial_number=w4.serial_number,
            from_cabinet_id=cabinet.id if cabinet else None,
            from_responsible_person_id=rp.id if rp else None,
            to_cabinet_id=cabinet.id if cabinet else None,
            to_responsible_person_id=rp.id if rp else None,
            transfer_reason='测试调拨',
            status='已确认',
            creator_id=admin.id,
            creator_name=admin.full_name,
            created_at=datetime.now() - timedelta(days=2),
            confirmer_id=admin.id,
            confirmer_name=admin.full_name,
            confirmed_at=datetime.now() - timedelta(days=2),
            remark='调整库存'
        )
        db.add(transfer)
        print("  - 手环 TEST00004 创建调拨记录")

    db.commit()
    print("\n测试数据创建完成！")
    print(f"  批次: {batch.batch_code}")
    print(f"  手环: TEST00001 ~ TEST00010")
    print(f"  - TEST00001: 已发放（有发放记录）")
    print(f"  - TEST00002: 待发放（有发放+归还记录）")
    print(f"  - TEST00003: 异常（有异常记录）")
    print(f"  - TEST00004: 待发放（有调拨记录）")
    print(f"  - TEST00005~010: 待发放（仅导入）")

except Exception as e:
    db.rollback()
    import traceback
    print(f"错误: {e}")
    traceback.print_exc()
finally:
    db.close()
