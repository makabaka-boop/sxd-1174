from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="operator")
    created_at = Column(DateTime, default=datetime.utcnow)


class ColorRule(Base):
    __tablename__ = "color_rules"
    id = Column(Integer, primary_key=True, index=True)
    color = Column(String(30), unique=True, nullable=False)
    color_hex = Column(String(7), default="#000000")
    meaning = Column(String(200))
    applicable_batches = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)


class Cabinet(Base):
    __tablename__ = "cabinets"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False)
    location = Column(String(200))
    capacity = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)


class ResponsiblePerson(Base):
    __tablename__ = "responsible_persons"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    department = Column(String(100))
    position = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)


class Batch(Base):
    __tablename__ = "batches"
    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200))
    color_rule_id = Column(Integer, ForeignKey("color_rules.id"))
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"))
    responsible_person_id = Column(Integer, ForeignKey("responsible_persons.id"))
    total_quantity = Column(Integer, default=0)
    event_date = Column(Date, default=date.today)
    description = Column(Text)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    color_rule = relationship("ColorRule", backref="batches")
    cabinet = relationship("Cabinet", backref="batches")
    responsible_person = relationship("ResponsiblePerson", backref="batches")
    wristbands = relationship("Wristband", back_populates="batch", cascade="all, delete-orphan")


class Wristband(Base):
    __tablename__ = "wristbands"
    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    color = Column(String(30), nullable=False)
    status = Column(String(30), default="待发放", index=True)
    recipient_name = Column(String(100))
    recipient_phone = Column(String(20))
    recipient_id_card = Column(String(50))
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"))
    responsible_person_id = Column(Integer, ForeignKey("responsible_persons.id"))
    issued_at = Column(DateTime)
    returned_at = Column(DateTime)
    expected_return_date = Column(Date)
    abnormal_flag = Column(Boolean, default=False)
    abnormal_type = Column(String(50))
    remark = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="wristbands")
    cabinet = relationship("Cabinet", backref="wristbands")
    responsible_person = relationship("ResponsiblePerson", backref="wristbands")
    issue_records = relationship("IssueRecord", back_populates="wristband", cascade="all, delete-orphan")
    return_records = relationship("ReturnRecord", back_populates="wristband", cascade="all, delete-orphan")
    abnormal_records = relationship("AbnormalRecord", back_populates="wristband", cascade="all, delete-orphan")


class IssueRecord(Base):
    __tablename__ = "issue_records"
    id = Column(Integer, primary_key=True, index=True)
    wristband_id = Column(Integer, ForeignKey("wristbands.id"), nullable=False)
    recipient_name = Column(String(100))
    recipient_phone = Column(String(20))
    recipient_id_card = Column(String(50))
    issue_person_id = Column(Integer, ForeignKey("users.id"))
    issue_person_name = Column(String(100))
    issue_location = Column(String(200))
    issued_at = Column(DateTime, default=datetime.utcnow)
    expected_return_date = Column(Date)
    remark = Column(Text)

    wristband = relationship("Wristband", back_populates="issue_records")
    issue_person = relationship("User", foreign_keys=[issue_person_id])


class ReturnRecord(Base):
    __tablename__ = "return_records"
    id = Column(Integer, primary_key=True, index=True)
    wristband_id = Column(Integer, ForeignKey("wristbands.id"), nullable=False)
    return_person_id = Column(Integer, ForeignKey("users.id"))
    return_person_name = Column(String(100))
    return_location = Column(String(200))
    returned_at = Column(DateTime, default=datetime.utcnow)
    condition = Column(String(50), default="完好")
    remark = Column(Text)
    confirmed = Column(Boolean, default=False)
    confirmed_by = Column(String(100))
    confirmed_at = Column(DateTime)

    wristband = relationship("Wristband", back_populates="return_records")
    return_person = relationship("User", foreign_keys=[return_person_id])


class AbnormalRecord(Base):
    __tablename__ = "abnormal_records"
    id = Column(Integer, primary_key=True, index=True)
    wristband_id = Column(Integer, ForeignKey("wristbands.id"), nullable=False)
    abnormal_type = Column(String(50), nullable=False)
    description = Column(Text)
    missing_explanation = Column(Text)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    reporter_name = Column(String(100))
    reported_at = Column(DateTime, default=datetime.utcnow)
    handled = Column(Boolean, default=False)
    handler_id = Column(Integer, ForeignKey("users.id"))
    handler_name = Column(String(100))
    handled_at = Column(DateTime)
    handling_result = Column(Text)

    wristband = relationship("Wristband", back_populates="abnormal_records")
    reporter = relationship("User", foreign_keys=[reporter_id])
    handler = relationship("User", foreign_keys=[handler_id])
