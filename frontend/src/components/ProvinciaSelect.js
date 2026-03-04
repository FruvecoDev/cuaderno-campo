import React from 'react';

// Lista oficial de provincias españolas
export const PROVINCIAS_ESPANA = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
  'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria',
  'Castellón', 'Ceuta', 'Ciudad Real', 'Córdoba', 'Cuenca',
  'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa',
  'Huelva', 'Huesca', 'Illes Balears',
  'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lugo',
  'Madrid', 'Málaga', 'Melilla', 'Murcia',
  'Navarra',
  'Orense', 'Palencia', 'Pontevedra',
  'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo',
  'Valencia', 'Valladolid', 'Vizcaya',
  'Zamora', 'Zaragoza'
];

const ProvinciaSelect = ({ 
  value, 
  onChange, 
  className = "form-input",
  placeholder = "-- Seleccionar provincia --",
  required = false,
  disabled = false,
  testId = "select-provincia",
  includeEmpty = true
}) => {
  return (
    <select
      className={className}
      value={value || ''}
      onChange={onChange}
      required={required}
      disabled={disabled}
      data-testid={testId}
    >
      {includeEmpty && <option value="">{placeholder}</option>}
      {PROVINCIAS_ESPANA.map(provincia => (
        <option key={provincia} value={provincia}>
          {provincia}
        </option>
      ))}
    </select>
  );
};

export default ProvinciaSelect;
