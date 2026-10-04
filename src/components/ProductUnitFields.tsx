import { Form, Select } from "antd";
import type { FormInstance } from "antd";
import { t } from "@/i18n";
import type { BusinessUser } from "@/api";
import { isServiceUnit } from "@/utils/serviceUnit";

type ProductUnitFieldsProps = {
  form: FormInstance;
  employees: BusinessUser[];
};

export function ProductUnitFields({ form, employees }: ProductUnitFieldsProps) {
  const unit = Form.useWatch("unit", form);
  const selected: string[] = Form.useWatch("performerBusinessUserIds", form) ?? [];
  const service = isServiceUnit(unit);
  const options = employees.filter(
    (employee) => employee.isActive || selected.includes(employee.id)
  );

  return (
    <>
      <Form.Item name="unit" label={t.products.unitLabel} initialValue="pièce">
        <Select
          options={[
            { value: "pièce", label: t.products.unitPiece },
            { value: "prestation", label: t.products.unitPrestation },
            { value: "forfait", label: t.products.unitForfait },
          ]}
        />
      </Form.Item>
      {service ? (
        <Form.Item
          name="performerBusinessUserIds"
          label={t.products.performersLabel}
          extra={t.products.performersHint}
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t.products.performersPlaceholder}
            options={options.map((employee) => ({
              value: employee.id,
              label: employee.fullName,
            }))}
          />
        </Form.Item>
      ) : null}
    </>
  );
}
