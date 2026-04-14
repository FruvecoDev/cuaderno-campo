import React from 'react';

const PAISES = [
  'España', 'Portugal', 'Francia', 'Italia', 'Alemania', 'Reino Unido',
  'Paises Bajos', 'Belgica', 'Austria', 'Suiza', 'Polonia', 'Rumania',
  'Grecia', 'Suecia', 'Dinamarca', 'Noruega', 'Finlandia', 'Irlanda',
  'Republica Checa', 'Hungria', 'Croacia', 'Bulgaria', 'Eslovaquia',
  'Eslovenia', 'Lituania', 'Letonia', 'Estonia', 'Luxemburgo', 'Malta', 'Chipre',
  'Marruecos', 'Argelia', 'Tunez', 'Egipto', 'Turquia',
  'Estados Unidos', 'Canada', 'Mexico', 'Brasil', 'Argentina', 'Chile',
  'Colombia', 'Peru', 'Ecuador', 'Uruguay', 'Paraguay', 'Venezuela', 'Bolivia',
  'Costa Rica', 'Panama', 'Republica Dominicana', 'Cuba', 'Guatemala', 'Honduras',
  'China', 'Japon', 'India', 'Corea del Sur', 'Australia', 'Nueva Zelanda',
  'Sudafrica', 'Arabia Saudi', 'Emiratos Arabes Unidos', 'Israel',
];

const PaisSelect = ({
  value,
  onChange,
  className = "form-input",
  placeholder = "-- Seleccionar pais --",
  testId = "select-pais",
}) => {
  return (
    <select
      className={className}
      value={value || ''}
      onChange={onChange}
      data-testid={testId}
    >
      <option value="">{placeholder}</option>
      {PAISES.map(pais => (
        <option key={pais} value={pais}>{pais}</option>
      ))}
    </select>
  );
};

export default PaisSelect;
