"""Initial multi-tenant schema with organizations, api_keys, incidents, and remediation_attempts

Revision ID: 001_multi_tenant
Revises: 
Create Date: 2026-09-14 05:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_multi_tenant'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Organizations ────────────────────────────────────────
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('slug', sa.String(length=128), nullable=False),
        sa.Column('plan_tier', sa.Enum('FREE', 'STARTER', 'PRO', 'ENTERPRISE', name='plan_tier', native_enum=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_organizations_slug', 'organizations', ['slug'], unique=True)
    op.create_index('ix_organizations_plan_tier', 'organizations', ['plan_tier'], unique=False)
    op.create_index('ix_organizations_is_active', 'organizations', ['is_active'], unique=False)

    # ── 2. API Keys ─────────────────────────────────────────────
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('key_prefix', sa.String(length=16), nullable=False),
        sa.Column('hashed_key', sa.String(length=64), nullable=False),
        sa.Column('scopes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('hashed_key', name='uq_api_keys_hashed_key'),
    )
    op.create_index('ix_api_keys_organization_id', 'api_keys', ['organization_id'], unique=False)
    op.create_index('ix_api_keys_key_prefix', 'api_keys', ['key_prefix'], unique=False)
    op.create_index('ix_api_keys_hashed_key', 'api_keys', ['hashed_key'], unique=True)
    op.create_index('ix_api_keys_is_active', 'api_keys', ['is_active'], unique=False)
    op.create_index('ix_api_keys_org_active', 'api_keys', ['organization_id', 'is_active'], unique=False)

    # ── 3. Incidents ────────────────────────────────────────────
    op.create_table(
        'incidents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sentry_issue_id', sa.String(length=128), nullable=False),
        sa.Column('sentry_event_id', sa.String(length=64), nullable=True),
        sa.Column('fingerprint', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=1024), nullable=False),
        sa.Column('error_type', sa.String(length=512), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(length=1024), nullable=True),
        sa.Column('function_name', sa.String(length=512), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=True),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('raw_event', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('project_slug', sa.String(length=256), nullable=True),
        sa.Column('environment', sa.String(length=64), nullable=True),
        sa.Column('platform', sa.String(length=64), nullable=True),
        sa.Column('level', sa.String(length=16), nullable=False, server_default='error'),
        sa.Column('status', sa.Enum('PENDING', 'ANALYZING', 'REMEDIATING', 'RESOLVED', 'FAILED', 'IGNORED', name='incident_status', native_enum=False), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('fingerprint', name='uq_incidents_fingerprint'),
    )
    op.create_index('ix_incidents_organization_id', 'incidents', ['organization_id'], unique=False)
    op.create_index('ix_incidents_sentry_issue_id', 'incidents', ['sentry_issue_id'], unique=False)
    op.create_index('ix_incidents_error_type', 'incidents', ['error_type'], unique=False)
    op.create_index('ix_incidents_status', 'incidents', ['status'], unique=False)
    op.create_index('ix_incidents_status_created', 'incidents', ['status', 'created_at'], unique=False)
    op.create_index('ix_incidents_org_status', 'incidents', ['organization_id', 'status'], unique=False)
    op.create_index('ix_incidents_org_created', 'incidents', ['organization_id', 'created_at'], unique=False)

    # ── 4. Remediation Attempts ─────────────────────────────────
    op.create_table(
        'remediation_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('incidents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('strategy', sa.String(length=256), nullable=False),
        sa.Column('analysis', sa.Text(), nullable=True),
        sa.Column('diff', sa.Text(), nullable=True),
        sa.Column('pr_url', sa.String(length=2048), nullable=True),
        sa.Column('pr_number', sa.Integer(), nullable=True),
        sa.Column('branch_name', sa.String(length=256), nullable=True),
        sa.Column('status', sa.Enum('IN_PROGRESS', 'PR_OPENED', 'PR_MERGED', 'FAILED', 'ROLLED_BACK', name='remediation_status', native_enum=False), nullable=False),
        sa.Column('llm_model', sa.String(length=128), nullable=False),
        sa.Column('llm_provider', sa.String(length=64), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cost_usd', sa.Float(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_remediation_organization_id', 'remediation_attempts', ['organization_id'], unique=False)
    op.create_index('ix_remediation_incident_id', 'remediation_attempts', ['incident_id'], unique=False)
    op.create_index('ix_remediation_status', 'remediation_attempts', ['status'], unique=False)
    op.create_index('ix_remediation_incident_status', 'remediation_attempts', ['incident_id', 'status'], unique=False)
    op.create_index('ix_remediation_org_status', 'remediation_attempts', ['organization_id', 'status'], unique=False)


def downgrade() -> None:
    op.drop_table('remediation_attempts')
    op.drop_table('incidents')
    op.drop_table('api_keys')
    op.drop_table('organizations')
