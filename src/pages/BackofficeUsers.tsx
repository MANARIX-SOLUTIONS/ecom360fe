import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Table, Tag, Typography, Input, Button, Skeleton, Select, Modal, Form, message, Dropdown, Tooltip, Drawer, Space } from 'antd'
import { Search, UserPlus, MoreVertical, Shield, Eye, Ban, CheckCircle, Mail, Calendar, Building2 } from 'lucide-react'
import styles from './Backoffice.module.css'
import { listAdminUsers, setUserStatus, type AdminUser } from '@/api/backoffice'

type PlatformUser = AdminUser & { lastLogin: string }

const roleColors: Record<string, string> = { 'Propriétaire': 'blue', 'Gestionnaire': 'green', 'Caissier': 'default' }
const statusColors: Record<string, string> = { active: 'success', inactive: 'warning', disabled: 'error' }
const statusLabels: Record<string, string> = { active: 'Actif', inactive: 'Inactif', disabled: 'Désactivé' }

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(d: string | null) {
  if (!d) return 'Jamais'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days}j`
  return formatDate(d)
}

export default function BackofficeUsers() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const resetPageRef = useRef(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detail, setDetail] = useState<PlatformUser | null>(null)
  const [form] = Form.useForm()
  const [modal, contextHolder] = Modal.useModal()

  const loadUsers = useCallback(async () => {
    const effectivePage = resetPageRef.current ? 0 : page
    if (resetPageRef.current) {
      resetPageRef.current = false
      setPage(0)
    }
    setLoading(true)
    try {
      const res = await listAdminUsers({
        page: effectivePage,
        size: pageSize,
        search: searchDebounced.trim() || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
      })
      const mapped: PlatformUser[] = (res.content || []).map((u) => ({
        ...u,
        lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 10) : '-',
      }))
      setUsers(mapped)
      setTotal(res.totalElements ?? 0)
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Erreur chargement utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced, filterStatus, filterRole])

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    resetPageRef.current = true
  }, [searchDebounced, filterStatus, filterRole])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleInvite = useCallback(() => {
    message.info('Invitation plateforme — fonctionnalité à venir')
    setInviteOpen(false)
  }, [])

  const toggleStatus = useCallback((user: PlatformUser) => {
    const isDisabled = user.status === 'disabled'
    const verb = isDisabled ? 'Réactiver' : 'Désactiver'
    modal.confirm({
      title: `${verb} "${user.name}" ?`,
      content: isDisabled
        ? 'L\'utilisateur pourra à nouveau se connecter.'
        : 'L\'utilisateur ne pourra plus se connecter.',
      okText: verb,
      okButtonProps: { danger: !isDisabled },
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await setUserStatus(user.id, isDisabled)
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: isDisabled ? 'active' : 'disabled' } : u))
          if (detail?.id === user.id) setDetail(prev => prev ? { ...prev, status: isDisabled ? 'active' : 'disabled' } : null)
          message.success(`${user.name} ${isDisabled ? 'réactivé' : 'désactivé'}`)
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Erreur')
        }
      },
    })
  }, [modal, detail])

  const handleContact = useCallback((user: PlatformUser) => {
    message.info(`Email envoyé à ${user.email}`)
  }, [])

  if (loading) {
    return <div className="pageWrapper"><Skeleton active paragraph={{ rows: 8 }} /></div>
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      {contextHolder}
      <div className={styles.pageHeader}>
        <Typography.Title level={4} className={styles.pageTitle}>Utilisateurs plateforme</Typography.Title>
        <Typography.Text type="secondary" className={styles.pageSubtitle}>
          {total} compte{total > 1 ? 's' : ''} sur la plateforme
        </Typography.Text>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            prefix={<Search size={16} />}
            placeholder="Rechercher nom, email ou entreprise..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            className={styles.toolbarSearch}
          />
          <Select value={filterRole} onChange={setFilterRole} style={{ minWidth: 140 }} options={[
            { value: 'all', label: 'Tous les rôles' },
            { value: 'Propriétaire', label: 'Propriétaire' },
            { value: 'Gestionnaire', label: 'Gestionnaire' },
            { value: 'Caissier', label: 'Caissier' },
          ]} />
          <Select value={filterStatus} onChange={setFilterStatus} style={{ minWidth: 120 }} options={[
            { value: 'all', label: 'Tous statuts' },
            { value: 'active', label: 'Actif' },
            { value: 'inactive', label: 'Inactif' },
            { value: 'disabled', label: 'Désactivé' },
          ]} />
        </div>
        <div className={styles.toolbarRight}>
          <Button type="primary" icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>Inviter</Button>
        </div>
      </div>

      {/* Table */}
      <Card bordered={false} className={styles.tableCard}>
        <div className="tableResponsive">
          <Table
            dataSource={users}
            rowKey="id"
            pagination={{
              current: page + 1,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (t) => `${t} utilisateur${t > 1 ? 's' : ''}`,
              onChange: (p, s) => { setPage((p || 1) - 1); setPageSize(s || 10) },
            }}
            className="dataTable"
            onRow={(record) => ({ onClick: () => setDetail(record), style: { cursor: 'pointer' } })}
            columns={[
              {
                title: 'Utilisateur', dataIndex: 'name',
                sorter: (a: PlatformUser, b: PlatformUser) => a.name.localeCompare(b.name),
                render: (_: string, r: PlatformUser) => (
                  <div className={styles.nameCell}>
                    <span className={styles.userAvatar}>{getInitials(r.name)}</span>
                    <div className={styles.nameCellInfo}>
                      <span className={styles.nameCellTitle}>{r.name}</span>
                      <span className={styles.nameCellSub}>{r.email}</span>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Rôle', dataIndex: 'role', width: 130,
                render: (role: string) => (
                  <Tag color={roleColors[role]} icon={role === 'Propriétaire' ? <Shield size={10} style={{ marginRight: 4 }} /> : undefined}>
                    {role}
                  </Tag>
                ),
              },
              {
                title: 'Entreprise', dataIndex: 'business', ellipsis: true,
                render: (b: string) => <Typography.Text type="secondary" ellipsis={{ tooltip: b }} style={{ maxWidth: 180 }}>{b}</Typography.Text>,
              },
              {
                title: 'Dernière connexion', dataIndex: 'lastLogin', width: 155,
                sorter: (a: PlatformUser, b: PlatformUser) => new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime(),
                render: (d: string) => d === '-' ? <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Jamais</span> : (
                  <Tooltip title={formatDate(d)}><span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{timeAgo(d)}</span></Tooltip>
                ),
              },
              {
                title: 'Statut', dataIndex: 'status', width: 105,
                render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
              },
              {
                title: '', key: 'actions', width: 48, align: 'center',
                render: (_: unknown, r: PlatformUser) => (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'view', icon: <Eye size={14} />, label: 'Voir le profil', onClick: () => setDetail(r) },
                        { key: 'email', icon: <Mail size={14} />, label: 'Envoyer un email', onClick: () => handleContact(r) },
                        { type: 'divider' },
                        r.status === 'disabled'
                          ? { key: 'enable', icon: <CheckCircle size={14} />, label: 'Réactiver', onClick: () => toggleStatus(r) }
                          : { key: 'disable', icon: <Ban size={14} />, label: 'Désactiver', danger: true, onClick: () => toggleStatus(r) },
                      ],
                    }}
                  >
                    <button
                      type="button"
                      onClick={e => e.stopPropagation()}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--color-text-muted)' }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </Dropdown>
                ),
              },
            ]}
          />
        </div>
      </Card>

      {/* Detail drawer */}
      <Drawer title="Profil utilisateur" open={!!detail} onClose={() => setDetail(null)} width={400}>
        {detail && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span className={styles.userAvatar} style={{ width: 56, height: 56, fontSize: 18, display: 'inline-flex' }}>
                {getInitials(detail.name)}
              </span>
              <Typography.Title level={5} style={{ margin: '12px 0 4px' }}>{detail.name}</Typography.Title>
              <Typography.Text type="secondary">{detail.email}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={roleColors[detail.role]} icon={detail.role === 'Propriétaire' ? <Shield size={10} style={{ marginRight: 4 }} /> : undefined}>
                  {detail.role}
                </Tag>
                <Tag color={statusColors[detail.status]}>{statusLabels[detail.status]}</Tag>
              </div>
            </div>

            <div className={styles.drawerSection}>
              <span className={styles.drawerSectionTitle}>Informations</span>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}><Building2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Entreprise</span>
                <span className={styles.drawerValue}>{detail.business}</span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}><Calendar size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Inscription</span>
                <span className={styles.drawerValue}>{formatDate(detail.createdAt)}</span>
              </div>
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Dernière connexion</span>
                <span className={styles.drawerValue}>{detail.lastLogin === '-' ? 'Jamais' : timeAgo(detail.lastLogin)}</span>
              </div>
            </div>

            <Space style={{ width: '100%', marginTop: 20 }} direction="vertical">
              <Button block icon={<Mail size={16} />} onClick={() => handleContact(detail)}>Envoyer un email</Button>
              <Button
                block
                danger={detail.status !== 'disabled'}
                type={detail.status === 'disabled' ? 'primary' : 'default'}
                onClick={() => toggleStatus(detail)}
              >
                {detail.status === 'disabled' ? 'Réactiver le compte' : 'Désactiver le compte'}
              </Button>
            </Space>
          </>
        )}
      </Drawer>

      {/* Invite modal */}
      <Modal
        title="Inviter un utilisateur"
        open={inviteOpen}
        onCancel={() => { setInviteOpen(false); form.resetFields() }}
        onOk={handleInvite}
        okText="Envoyer l'invitation"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nom complet">
            <Input placeholder="Ex: Moussa Keita" />
          </Form.Item>
          <Form.Item name="email" label="Adresse email" rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}>
            <Input prefix={<Mail size={16} />} placeholder="email@exemple.sn" />
          </Form.Item>
          <Form.Item name="role" label="Rôle" initialValue="Caissier">
            <Select options={[{ value: 'Propriétaire', label: 'Propriétaire' }, { value: 'Gestionnaire', label: 'Gestionnaire' }, { value: 'Caissier', label: 'Caissier' }]} />
          </Form.Item>
          <Form.Item name="business" label="Entreprise" rules={[{ required: true, message: 'Requis' }]}>
            <Select placeholder="Sélectionner l'entreprise" options={[
              { value: 'Boutique Dakar Centre', label: 'Boutique Dakar Centre' },
              { value: 'Commerce Thiès', label: 'Commerce Thiès' },
              { value: 'Mini Market Rufisque', label: 'Mini Market Rufisque' },
              { value: 'Marché Pikine', label: 'Marché Pikine' },
              { value: 'Super Alimentation', label: 'Super Alimentation' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
