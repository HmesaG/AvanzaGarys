"use client";

import { useEffect, useRef } from "react";
import TomSelect from "tom-select";
import "tom-select/dist/css/tom-select.css";

type Option = { value: string; label: string };

export default function SelectField({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const tsRef = useRef<TomSelect | null>(null);

  useEffect(() => {
    if (!selectRef.current) return;
    const ts = new TomSelect(selectRef.current, {
      placeholder,
      allowEmptyOption: true,
      controlInput: null,
      onChange: (val: string) => onChange(val),
    });
    tsRef.current = ts;
    return () => {
      ts.destroy();
      tsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tsRef.current && tsRef.current.getValue() !== value) {
      tsRef.current.setValue(value, true);
    }
  }, [value]);

  // Si las opciones llegan después del montaje (ej. un selector que carga
  // async vía fetch), Tom Select no se refresca solo — reconstruimos su
  // lista interna cuando cambia el *contenido* del array (no la identidad,
  // para no disparar esto en cada render).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const firmaOpciones = options.map((o) => `${o.value}:${o.label}`).join("|");
  useEffect(() => {
    const ts = tsRef.current;
    if (!ts) return;
    const actual = ts.getValue();
    ts.clearOptions();
    options.forEach((opt) => ts.addOption(opt));
    ts.refreshOptions(false);
    if (actual) ts.setValue(actual, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaOpciones]);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        ref={selectRef}
        id={id}
        required={required}
        defaultValue={value}
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
