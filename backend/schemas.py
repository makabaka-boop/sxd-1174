from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "operator"


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class ColorRuleBase(BaseModel):
    color: str
    color_hex: str = "#000000"
    meaning: Optional[str] = None
    applicable_batches: Optional[str] = None


class ColorRuleCreate(ColorRuleBase):
    pass


class ColorRuleResponse(ColorRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CabinetBase(BaseModel):
    code: str
    location: Optional[str] = None
    capacity: int = 100


class CabinetCreate(CabinetBase):
    pass


class CabinetResponse(CabinetBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ResponsiblePersonBase(BaseModel):
    name: str
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None


class ResponsiblePersonCreate(ResponsiblePersonBase):
    pass


class ResponsiblePersonResponse(ResponsiblePersonBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BatchBase(BaseModel):
    batch_code: str
    name: Optional[str] = None
    color_rule_id: Optional[int] = None
    cabinet_id: Optional[int] = None
    responsible_person_id: Optional[int] = None
    total_quantity: int = 0
    event_date: Optional[date] = None
    description: Optional[str] = None
    status: str = "active"


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    color_rule_id: Optional[int] = None
    cabinet_id: Optional[int] = None
    responsible_person_id: Optional[int] = None
    event_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None


class BatchResponse(BatchBase):
    id: int
    created_at: datetime
    color_rule: Optional[ColorRuleResponse] = None
    cabinet: Optional[CabinetResponse] = None
    responsible_person: Optional[ResponsiblePersonResponse] = None
    wristband_count: Optional[int] = 0

    class Config:
        from_attributes = True


class WristbandBase(BaseModel):
    serial_number: str
    batch_id: int
    color: str
    cabinet_id: Optional[int] = None
    responsible_person_id: Optional[int] = None
    expected_return_date: Optional[date] = None
    remark: Optional[str] = None


class WristbandCreate(WristbandBase):
    pass


class WristbandImport(BaseModel):
    batch_id: int
    start_serial: str
    end_serial: Optional[str] = None
    count: Optional[int] = None
    color: str
    cabinet_id: Optional[int] = None
    responsible_person_id: Optional[int] = None
    expected_return_date: Optional[date] = None


class IssueWristbandRequest(BaseModel):
    serial_number: str
    recipient_name: str
    recipient_phone: Optional[str] = None
    recipient_id_card: Optional[str] = None
    expected_return_date: Optional[date] = None
    remark: Optional[str] = None
    issue_location: Optional[str] = None


class ReturnWristbandRequest(BaseModel):
    serial_number: str
    condition: str = "完好"
    remark: Optional[str] = None
    return_location: Optional[str] = None


class ConfirmReturnRequest(BaseModel):
    return_record_id: int
    remark: Optional[str] = None


class ReportAbnormalRequest(BaseModel):
    serial_number: str
    abnormal_type: str
    description: str
    missing_explanation: Optional[str] = None


class HandleAbnormalRequest(BaseModel):
    abnormal_record_id: int
    handling_result: str
    change_status_to: Optional[str] = None


class WristbandResponse(BaseModel):
    id: int
    serial_number: str
    batch_id: int
    color: str
    status: str
    recipient_name: Optional[str]
    recipient_phone: Optional[str]
    recipient_id_card: Optional[str]
    cabinet_id: Optional[int]
    responsible_person_id: Optional[int]
    issued_at: Optional[datetime]
    returned_at: Optional[datetime]
    expected_return_date: Optional[date]
    abnormal_flag: bool
    abnormal_type: Optional[str]
    remark: Optional[str]
    created_at: datetime
    updated_at: datetime
    batch_code: Optional[str] = None
    batch_name: Optional[str] = None
    cabinet_code: Optional[str] = None
    responsible_person_name: Optional[str] = None
    is_overdue: bool = False
    days_overdue: int = 0

    class Config:
        from_attributes = True


class IssueRecordResponse(BaseModel):
    id: int
    wristband_id: int
    serial_number: Optional[str] = None
    recipient_name: Optional[str]
    recipient_phone: Optional[str]
    recipient_id_card: Optional[str]
    issue_person_name: Optional[str]
    issue_location: Optional[str]
    issued_at: datetime
    expected_return_date: Optional[date]
    remark: Optional[str]

    class Config:
        from_attributes = True


class ReturnRecordResponse(BaseModel):
    id: int
    wristband_id: int
    serial_number: Optional[str] = None
    return_person_name: Optional[str]
    return_location: Optional[str]
    returned_at: datetime
    condition: str
    remark: Optional[str]
    confirmed: bool
    confirmed_by: Optional[str]
    confirmed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AbnormalRecordResponse(BaseModel):
    id: int
    wristband_id: int
    serial_number: Optional[str] = None
    abnormal_type: str
    description: str
    missing_explanation: Optional[str]
    reporter_name: Optional[str]
    reported_at: datetime
    handled: bool
    handler_name: Optional[str]
    handled_at: Optional[datetime]
    handling_result: Optional[str]
    is_overdue: bool = False
    days_overdue: int = 0

    class Config:
        from_attributes = True


class WristbandFilter(BaseModel):
    batch_id: Optional[int] = None
    batch_code: Optional[str] = None
    color: Optional[str] = None
    responsible_person_id: Optional[int] = None
    status: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    abnormal_only: Optional[bool] = None
    overdue_only: Optional[bool] = None
    search: Optional[str] = None


class ColorDistributionItem(BaseModel):
    color: str
    color_hex: str
    count: int
    percentage: float


class ResponsibleLoadItem(BaseModel):
    person_id: int
    person_name: str
    issued_count: int
    returned_count: int
    abnormal_count: int


class RecoveryRateItem(BaseModel):
    date: str
    issued_count: int
    returned_count: int
    timely_count: int
    timely_rate: float


class PendingItem(BaseModel):
    type: str
    count: int
    items: List[dict] = []


class HighFrequencyMissingItem(BaseModel):
    person_name: Optional[str]
    count: int
    serial_numbers: List[str]


class RecoveryLagItem(BaseModel):
    serial_number: str
    recipient_name: str
    expected_return_date: Optional[date]
    days_overdue: int


class IncompleteAbnormalItem(BaseModel):
    abnormal_record_id: int
    serial_number: str
    abnormal_type: str
    reported_at: datetime
    hours_pending: float


class OverdueByBatchItem(BaseModel):
    batch_id: int
    batch_code: str
    batch_name: Optional[str] = None
    total_issued: int
    overdue_count: int
    overdue_rate: float


class OverdueByPersonItem(BaseModel):
    person_id: int
    person_name: str
    department: Optional[str] = None
    total_issued: int
    overdue_count: int
    overdue_rate: float


class StatisticsResponse(BaseModel):
    total_batches: int
    total_wristbands: int
    pending_issue: int
    issued: int
    pending_return_confirm: int
    returned: int
    abnormal_observation: int
    disabled: int
    overdue_count: int
    color_distribution: List[ColorDistributionItem]
    recovery_timely_rate: float
    recovery_rate_trend: List[RecoveryRateItem]
    responsible_load: List[ResponsibleLoadItem]
    pending_items: PendingItem
    high_frequency_missing: List[HighFrequencyMissingItem]
    recovery_lag: List[RecoveryLagItem]
    incomplete_abnormal: List[IncompleteAbnormalItem]
    overdue_by_batch: List[OverdueByBatchItem]
    overdue_by_person: List[OverdueByPersonItem]


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List


class TransferCreateRequest(BaseModel):
    wristband_ids: List[int]
    to_cabinet_id: int
    to_responsible_person_id: int
    transfer_reason: Optional[str] = None
    remark: Optional[str] = None


class TransferConfirmRequest(BaseModel):
    transfer_id: int


class TransferResponse(BaseModel):
    id: int
    transfer_code: str
    wristband_id: int
    serial_number: str
    from_cabinet_id: Optional[int] = None
    from_responsible_person_id: Optional[int] = None
    to_cabinet_id: int
    to_responsible_person_id: int
    transfer_reason: Optional[str] = None
    remark: Optional[str] = None
    status: str
    creator_name: Optional[str] = None
    created_at: datetime
    confirmer_name: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    from_cabinet_code: Optional[str] = None
    from_responsible_person_name: Optional[str] = None
    to_cabinet_code: Optional[str] = None
    to_responsible_person_name: Optional[str] = None
    batch_code: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


class TransferableWristbandFilter(BaseModel):
    serial_number: Optional[str] = None
    batch_id: Optional[int] = None
    color: Optional[str] = None
    cabinet_id: Optional[int] = None


class TransferableWristbandResponse(BaseModel):
    id: int
    serial_number: str
    batch_id: int
    batch_code: Optional[str] = None
    color: str
    cabinet_id: Optional[int] = None
    cabinet_code: Optional[str] = None
    responsible_person_id: Optional[int] = None
    responsible_person_name: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
