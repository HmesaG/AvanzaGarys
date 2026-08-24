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
  const opcionesFirmaRef = useRef<string>("");

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

  // TomSelect solo lee las <option> del <select> al construirse (efecto de
  // montaje, más arriba). Si `options` llega después del montaje —caso de
  // catálogos cargados por fetch, como el selector de empresa en /registro—
  // el dropdown quedaría vacío para siempre sin este resync explícito.
  //
  // Se compara por contenido (no por identidad de array) porque varios
  // llamadores pasan `algoEstatico.map(...)` inline: eso crea un array nuevo
  // en cada render aunque el contenido no cambie, y reconstruir el dropdown
  // en cada tecleo (p. ej. mientras el usuario escribe en otro campo del
  // mismo formulario) sería trabajo innecesario y podría cerrarlo si está abierto.
  useEffect(() => {
    const ts = tsRef.current;
    if (!ts) return;
    const firma = JSON.stringify(options);
    if (firma === opcionesFirmaRef.current) return;
    opcionesFirmaRef.current = firma;

    const actual = ts.getValue();
    ts.clearOptions();
    options.forEach((opt) => ts.addOption({ value: opt.value, text: opt.label }));
    ts.refreshOptions(false);
    if (actual) ts.setValue(actual, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

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
