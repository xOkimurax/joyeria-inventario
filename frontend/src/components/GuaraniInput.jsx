/**
 * Input para montos en guaraníes.
 * - Muestra separador de miles (ej: 1.500.000)
 * - Muestra el símbolo ₲ a la izquierda
 * - Llama a onChange con el valor numérico limpio (string de dígitos)
 */
export default function GuaraniInput({ value, onChange, className = '', ...props }) {
  const formatted = value !== '' && value !== undefined && value !== null
    ? Number(value).toLocaleString('es-PY')
    : '';

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    onChange(raw);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none">₲</span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={handleChange}
        className={`${className} pl-8`}
      />
    </div>
  );
}
