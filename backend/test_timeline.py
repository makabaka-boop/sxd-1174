
import requests
import json

BASE_URL = "http://localhost:8000"

def login():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]

def test_timeline(serial, token):
    print(f"\n=== {serial} ===")
    resp = requests.get(f"{BASE_URL}/api/wristbands/{serial}/timeline", 
                        headers={"Authorization": f"Bearer {token}"})
    if resp.status_code != 200:
        print(f"错误: {resp.status_code} - {resp.text}")
        return
    
    data = resp.json()
    wb = data["wristband"]
    timeline = data["timeline"]
    
    print(f"状态: {wb['status']}")
    print(f"当前柜位: {wb.get('cabinet_code', '-')}")
    print(f"当前负责人: {wb.get('responsible_person_name', '-')}")
    print(f"时间线事件数: {len(timeline)}")
    print("-" * 60)
    for e in timeline:
        print(f"  [{e['event_type']}]")
        print(f"    时间: {e['event_time']}")
        print(f"    操作人: {e.get('operator_name', '-')}")
        if e.get('recipient_name'):
            print(f"    接收人: {e['recipient_name']} ({e.get('recipient_phone', '-')})")
        if e.get('cabinet_info'):
            print(f"    柜位: {e['cabinet_info']}")
        if e.get('responsible_person'):
            print(f"    负责人: {e['responsible_person']}")
        if e.get('remark'):
            print(f"    备注: {e['remark']}")
        print()

if __name__ == "__main__":
    token = login()
    print("登录成功")
    
    test_timeline("TEST00001", token)  # 已发放
    test_timeline("TEST00002", token)  # 发放+归还
    test_timeline("TEST00003", token)  # 异常
    test_timeline("TEST00004", token)  # 调拨
    test_timeline("TEST00005", token)  # 仅导入
