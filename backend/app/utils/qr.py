"""QR code generation utility."""
import io
import json
import base64
import uuid
from datetime import datetime, timedelta
import qrcode

from ..extensions import db
from ..models.qr_pass import QRPass


def generate_qr_pass(permission_request, verification_base_url):
    """Generate a QR pass after final approval.
    
    Args:
        permission_request: The approved PermissionRequest object
        verification_base_url: Base URL for verification page
        
    Returns:
        QRPass object
    """
    pass_number = f"QR-{uuid.uuid4().hex[:8].upper()}"
    
    # Data embedded in the QR code (no sensitive info)
    qr_payload = {
        'pass_id': pass_number,
        'student': permission_request.student.full_name,
        'student_id': permission_request.student.student_profile.student_id if permission_request.student.student_profile else '',
        'type': permission_request.permission_type,
        'date': permission_request.date.isoformat(),
        'from_time': permission_request.from_time.strftime('%H:%M'),
        'to_time': permission_request.to_time.strftime('%H:%M'),
        'verify_url': f"{verification_base_url}/{pass_number}",
    }
    
    # Calculate expiry: end of permission time on the permission date
    expires_at = datetime.combine(
        permission_request.date,
        permission_request.to_time
    ) + timedelta(hours=1)  # 1-hour grace period after to_time
    
    # Generate QR image as base64
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(json.dumps(qr_payload))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_image_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Create QR pass record
    qr_pass = QRPass(
        request_id=permission_request.id,
        pass_number=pass_number,
        qr_data=json.dumps(qr_payload),
        qr_image=qr_image_b64,
        expires_at=expires_at,
        status='active',
    )
    
    db.session.add(qr_pass)
    db.session.commit()
    
    return qr_pass
