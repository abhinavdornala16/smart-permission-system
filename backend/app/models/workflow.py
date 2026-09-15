"""Configurable approval workflow model."""
from ..extensions import db


class WorkflowConfig(db.Model):
    """Configurable multi-level approval workflow per request type."""
    __tablename__ = 'workflow_config'

    id = db.Column(db.Integer, primary_key=True)
    request_type = db.Column(db.String(30), nullable=False, index=True)
    step_number = db.Column(db.Integer, nullable=False)
    approver_role = db.Column(db.String(30), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    __table_args__ = (
        db.UniqueConstraint('request_type', 'step_number', name='uq_workflow_step'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'request_type': self.request_type,
            'step_number': self.step_number,
            'approver_role': self.approver_role,
            'is_active': self.is_active,
        }

    @staticmethod
    def get_workflow(request_type):
        """Get ordered workflow steps for a given request type."""
        return WorkflowConfig.query.filter_by(
            request_type=request_type, is_active=True
        ).order_by(WorkflowConfig.step_number).all()

    @staticmethod
    def get_next_approver_role(request_type, current_step):
        """Get the next approver role after the current step."""
        next_step = WorkflowConfig.query.filter_by(
            request_type=request_type, is_active=True
        ).filter(
            WorkflowConfig.step_number > current_step
        ).order_by(WorkflowConfig.step_number).first()
        return next_step
