import { useNavigate } from 'react-router-dom'
import { Result, Button } from 'antd'
import { Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Result
        status="404"
        title="404"
        subTitle="Page non trouvée"
        extra={
          <Button type="primary" icon={<Home size={16} />} onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </Button>
        }
      />
    </div>
  )
}
