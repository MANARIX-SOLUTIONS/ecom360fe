import { useNavigate } from "react-router-dom";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { Plus, ShoppingCart, Package, Users, Receipt, ClipboardList } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import styles from "./shell.module.css";

export function QuickCreate() {
  const navigate = useNavigate();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();

  const items: MenuProps["items"] = [];
  if (canAccessBackend("pos")) {
    items.push({
      key: "pos",
      icon: <ShoppingCart size={16} />,
      label: "Nouvelle vente",
      onClick: () => navigate("/pos"),
    });
  }
  if (canAccessBackend("products")) {
    items.push({
      key: "product",
      icon: <Package size={16} />,
      label: "Produit ou prestation",
      onClick: () => navigate("/products"),
    });
  }
  if (canAccessBackend("clients")) {
    items.push({
      key: "client",
      icon: <Users size={16} />,
      label: "Client",
      onClick: () => navigate("/clients"),
    });
  }
  if (canAccessPlan("expenses", canAccessBackend("expenses"))) {
    items.push({
      key: "expense",
      icon: <Receipt size={16} />,
      label: "Dépense",
      onClick: () => navigate("/expenses"),
    });
  }
  if (canAccessPlan("purchaseOrders", canAccessBackend("purchaseOrders"))) {
    items.push({
      key: "po",
      icon: <ClipboardList size={16} />,
      label: "Bon de commande",
      onClick: () => navigate("/purchase-orders"),
    });
  }

  if (items.length === 0) return null;

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <Button type="primary" icon={<Plus size={16} />} className={styles.quickCreateBtn}>
        Créer
      </Button>
    </Dropdown>
  );
}
