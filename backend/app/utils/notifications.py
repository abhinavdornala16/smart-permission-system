"""Notification helper utilities."""
from ..extensions import db
from ..models.notification import Notification


def create_notification(user_id, title, message, notification_type='info',
                       entity_type=None, entity_id=None):
    """Create an in-app notification for a user."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.session.add(notification)
    db.session.commit()
    return notification


def notify_approval_chain(request_obj, action, actor_name, next_approver_id=None):
    """Send notifications along the approval chain.
    
    Args:
        request_obj: The permission request or leave request
        action: 'approved' or 'rejected'
        actor_name: Name of the person taking action
        next_approver_id: User ID of the next approver (if any)
    """
    student_id = getattr(request_obj, 'student_id', None)
    faculty_id = getattr(request_obj, 'faculty_id', None)
    req_number = request_obj.request_number
    entity_type = 'permission' if student_id else 'leave'

    if action == 'approved' and next_approver_id:
        # Notify the next approver
        create_notification(
            user_id=next_approver_id,
            title='Approval Required',
            message=f'Request {req_number} requires your approval. Forwarded by {actor_name}.',
            notification_type='warning',
            entity_type=entity_type,
            entity_id=request_obj.id,
        )
    elif action == 'approved' and not next_approver_id:
        # Final approval — notify the requester
        owner_id = student_id or faculty_id
        if entity_type == 'permission':
            create_notification(
                user_id=owner_id,
                title='Permission Approved',
                message=f'Your permission request {req_number} has been fully approved. Your QR pass is ready.',
                notification_type='success',
                entity_type=entity_type,
                entity_id=request_obj.id,
            )
        else:
            create_notification(
                user_id=owner_id,
                title='Leave Approved',
                message=f'Your leave request {req_number} has been approved.',
                notification_type='success',
                entity_type=entity_type,
                entity_id=request_obj.id,
            )
    elif action == 'rejected':
        owner_id = student_id or faculty_id
        create_notification(
            user_id=owner_id,
            title='Request Rejected',
            message=f'Your request {req_number} has been rejected by {actor_name}.',
            notification_type='error',
            entity_type=entity_type,
            entity_id=request_obj.id,
        )
