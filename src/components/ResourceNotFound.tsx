import { useNavigate } from "react-router-dom";
import { Result, Button } from "antd";
import { ArrowLeft } from "lucide-react";

type Props = {
  resource: string;
  backPath: string;
  backLabel?: string;
};

export function ResourceNotFound({ resource, backPath, backLabel }: Props) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Result
        status="404"
        title={`${resource} introuvable`}
        subTitle="Cette ressource n'existe pas ou a été supprimée."
        extra={
          <Button type="primary" icon={<ArrowLeft size={16} />} onClick={() => navigate(backPath)}>
            {backLabel ?? "Retour à la liste"}
          </Button>
        }
      />
    </div>
  );
}
