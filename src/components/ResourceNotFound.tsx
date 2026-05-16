import { useNavigate } from "react-router-dom";
import { Result, Button } from "antd";
import { ArrowLeft } from "lucide-react";
import { t } from "@/i18n";

type Props = {
  resource: string;
  backPath: string;
  backLabel?: string;
};

export function ResourceNotFound({ resource, backPath, backLabel }: Props) {
  const navigate = useNavigate();
  const title = t.common.resourceNotFoundTitle.replace("{resource}", resource);
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
        title={title}
        subTitle={t.common.resourceNotFoundSubtitle}
        extra={
          <Button type="primary" icon={<ArrowLeft size={16} />} onClick={() => navigate(backPath)}>
            {backLabel ?? t.common.backToList}
          </Button>
        }
      />
    </div>
  );
}
