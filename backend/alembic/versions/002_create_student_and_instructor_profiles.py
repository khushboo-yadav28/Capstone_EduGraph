"""create student and instructor profiles

Revision ID: 002_user_profiles
Revises: 001_course_docs
Create Date: 2026-10-24 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_user_profiles'
down_revision: Union[str, Sequence[str], None] = '001_course_docs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create student_profiles table
    op.create_table(
        'student_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
            unique=True
        ),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('program', sa.String(length=100), nullable=True),
        sa.Column('semester', sa.String(length=50), nullable=True),
        sa.Column('batch', sa.String(length=50), nullable=True),
        sa.Column('enrollment_number', sa.String(length=100), nullable=True, unique=True),
        sa.Column('academic_year', sa.String(length=50), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('interests', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_student_profiles_id'), 'student_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_student_profiles_user_id'), 'student_profiles', ['user_id'], unique=True)
    op.create_index(op.f('ix_student_profiles_enrollment_number'), 'student_profiles', ['enrollment_number'], unique=True)

    # 2. Create instructor_profiles table
    op.create_table(
        'instructor_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
            unique=True
        ),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('designation', sa.String(length=100), nullable=True),
        sa.Column('qualifications', sa.String(length=255), nullable=True),
        sa.Column('expertise', sa.String(length=255), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('office_hours', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index(op.f('ix_instructor_profiles_id'), 'instructor_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_instructor_profiles_user_id'), 'instructor_profiles', ['user_id'], unique=True)

    # 3. Data Migration / Backfill existing Users
    op.execute("""
        INSERT INTO student_profiles (id, user_id, created_at, updated_at)
        SELECT gen_random_uuid(), id, now(), now()
        FROM users
        WHERE role = 'STUDENT'
        ON CONFLICT (user_id) DO NOTHING;
    """)

    op.execute("""
        INSERT INTO instructor_profiles (id, user_id, created_at, updated_at)
        SELECT gen_random_uuid(), id, now(), now()
        FROM users
        WHERE role = 'INSTRUCTOR'
        ON CONFLICT (user_id) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_index(op.f('ix_instructor_profiles_user_id'), table_name='instructor_profiles')
    op.drop_index(op.f('ix_instructor_profiles_id'), table_name='instructor_profiles')
    op.drop_table('instructor_profiles')

    op.drop_index(op.f('ix_student_profiles_enrollment_number'), table_name='student_profiles')
    op.drop_index(op.f('ix_student_profiles_user_id'), table_name='student_profiles')
    op.drop_index(op.f('ix_student_profiles_id'), table_name='student_profiles')
    op.drop_table('student_profiles')
