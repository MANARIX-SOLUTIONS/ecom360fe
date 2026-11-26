import { Card, Col, Row, Typography } from "antd";
import { Building2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/backoffice/PageHeader";
import styles from "./Backoffice.module.css";

export default function BackofficeRoles() {
  const navigate = useNavigate();

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Rôles et accès"
        subtitle="Les privilèges plateforme restent distincts des rôles marchands."
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card variant="borderless" className={styles.card}>
            <Shield size={20} aria-hidden />
            <Typography.Title level={4} style={{ marginTop: 12 }}>
              Accès plateforme
            </Typography.Title>
            <Typography.Paragraph>
              Seul le rôle <Typography.Text strong>PLATFORM_ADMIN</Typography.Text> ouvre cette
              console. Un propriétaire d'entreprise n'obtient jamais ces privilèges parce qu'il
              possède un commerce.
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Les rôles Support, Finance ou Auditeur ne sont pas encore modélisés dans
              l'autorisation backend. Ils restent planifiés plutôt que simulés.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card variant="borderless" className={styles.card}>
            <Building2 size={20} aria-hidden />
            <Typography.Title level={4} style={{ marginTop: 12 }}>
              Rôles marchands
            </Typography.Title>
            <Typography.Paragraph>
              Propriétaire, gestionnaire et caissier sont des rôles d'entreprise. Leurs permissions
              se gèrent dans la fiche de chaque société.
            </Typography.Paragraph>
            <Typography.Link onClick={() => navigate("/backoffice/businesses")}>
              Ouvrir les entreprises
            </Typography.Link>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
