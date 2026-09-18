"""QR Pass model for verified permission passes."""
from datetime import datetime
from ..extensions import db
from ..utils.time_utils import utcnow


class QRPass(db.Model):
    """Digital QR pass generated after final approval."""
    __tablename__ = 'qr_passes'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('permission_requests.id'), unique=True, nullable=False)
    pass_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    qr_data = db.Column(db.Text, nullable=False)  # JSON string with pass info
    qr_image = db.Column(db.Text, nullable=True)   # Base64 encoded QR image
    generated_at = db.Column(db.DateTime, default=utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, expired, revoked

    STATUSES = ['active', 'expired', 'revoked']

    @property
    def is_valid(self):
        """Check if the pass is currently valid."""
        if self.status != 'active':
            return False
        return utcnow() < self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'pass_number': self.pass_number,
            'qr_data': self.qr_data,
            'qr_image': self.qr_image,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status,
            'is_valid': self.is_valid,
        }
