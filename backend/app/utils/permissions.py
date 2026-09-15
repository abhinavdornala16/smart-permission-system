"""Permission workflow helper utilities."""
from ..models.workflow import WorkflowConfig
from ..models.audit_log import AuditLog
from ..extensions import db


def get_first_approver_role(permission_type):
    """Get the first approver role for a permission type."""
    first_step = WorkflowConfig.query.filter_by(
        request_type=permission_type, is_active=True
    ).order_by(WorkflowConfig.step_number).first()
    return first_step.approver_role if first_step else 'mentor'


def get_current_step_number(permission_type, current_role):
    """Get the step number for the current approver role."""
    step = WorkflowConfig.query.filter_by(
        request_type=permission_type,
        approver_role=current_role,
        is_active=True
    ).first()
    return step.step_number if step else 0


def get_next_step(permission_type, current_step_number):
    """Get the next workflow step after the current one."""
    return WorkflowConfig.query.filter_by(
        request_type=permission_type, is_active=True
    ).filter(
        WorkflowConfig.step_number > current_step_number
    ).order_by(WorkflowConfig.step_number).first()


def is_final_step(permission_type, current_role):
    """Check if the current role is the final approval step."""
    current_step = get_current_step_number(permission_type, current_role)
    next_step = get_next_step(permission_type, current_step)
    return next_step is None


def create_audit_log(user_id, action, entity_type, entity_id=None,
                     old_status=None, new_status=None, remarks=None,
                     ip_address=None):
    """Create an audit log entry."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_status=old_status,
        new_status=new_status,
        remarks=remarks,
        ip_address=ip_address,
    )
    db.session.add(log)
    db.session.commit()
    return log
