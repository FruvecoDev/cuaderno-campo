import React from 'react';
import { Upload, Trash2, X, Image } from 'lucide-react';

const MaquinariaForm = ({
  formData,
  setFormData,
  editingId,
  onSubmit,
  onCancel,
  fieldsConfig,
  TIPOS_MAQUINARIA,
  ESTADOS_MAQUINARIA,
  uploadingImage,
  imagePreview,
  selectedImage,
  setSelectedImage,
  setImagePreview,
  isDragging,
  setIsDragging,
  handleImageSelect,
  deleteImage,
}) => {
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleImageSelect({ target: { files } });
  };

  return (
    <div className="card mb-6" data-testid="maquinaria-form">
      <h2 className="card-title">{editingId ? 'Editar Maquinaria' : 'Nueva Maquinaria'}</h2>
      <form onSubmit={onSubmit}>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input type="text" className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Tractor principal" required data-testid="input-nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <select className="form-select" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} required data-testid="select-tipo">
              {TIPOS_MAQUINARIA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {fieldsConfig.marca && (
            <div className="form-group">
              <label className="form-label">Marca</label>
              <input type="text" className="form-input" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} placeholder="Ej: John Deere" data-testid="input-marca" />
            </div>
          )}
          {fieldsConfig.modelo && (
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <input type="text" className="form-input" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} placeholder="Ej: 6150M" data-testid="input-modelo" />
            </div>
          )}
          {fieldsConfig.matricula && (
            <div className="form-group">
              <label className="form-label">Matricula</label>
              <input type="text" className="form-input" value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: e.target.value})} placeholder="Ej: 1234-ABC" data-testid="input-matricula" />
            </div>
          )}
          {fieldsConfig.num_serie && (
            <div className="form-group">
              <label className="form-label">N Serie</label>
              <input type="text" className="form-input" value={formData.num_serie} onChange={(e) => setFormData({...formData, num_serie: e.target.value})} data-testid="input-num-serie" />
            </div>
          )}
          {fieldsConfig.año_fabricacion && (
            <div className="form-group">
              <label className="form-label">Ano Fabricacion</label>
              <input type="number" min="1900" max={new Date().getFullYear() + 1} className="form-input" value={formData.año_fabricacion} onChange={(e) => setFormData({...formData, año_fabricacion: e.target.value})} placeholder="Ej: 2020" data-testid="input-año" />
            </div>
          )}
          {fieldsConfig.capacidad && (
            <div className="form-group">
              <label className="form-label">Capacidad</label>
              <input type="text" className="form-input" value={formData.capacidad} onChange={(e) => setFormData({...formData, capacidad: e.target.value})} placeholder="Ej: 1000L, 150CV" data-testid="input-capacidad" />
            </div>
          )}
          {fieldsConfig.estado && (
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} data-testid="select-estado">
                {ESTADOS_MAQUINARIA.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          )}
        </div>

        {fieldsConfig.observaciones && (
          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <textarea className="form-input" rows={3} value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Notas adicionales..." data-testid="textarea-observaciones" />
          </div>
        )}

        {/* Image upload for Placa CE */}
        {fieldsConfig.imagen_placa_ce && (
          <div className="form-group">
            <label className="form-label">
              <Image size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Imagen Placa CE
            </label>
            <div
              style={{ border: isDragging ? '2px solid hsl(var(--primary))' : '2px dashed hsl(var(--border))', borderRadius: '8px', padding: '1rem', backgroundColor: isDragging ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)', transition: 'all 0.2s ease' }}
              onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
            >
              {imagePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={imagePreview} alt="Placa CE Preview" style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px', border: '1px solid hsl(var(--border))' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                      <Upload size={14} style={{ marginRight: '0.25rem' }} /> Cambiar
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{ display: 'none' }} data-testid="input-imagen-change" />
                    </label>
                    {editingId && !selectedImage && (
                      <button type="button" className="btn btn-sm btn-error" onClick={() => deleteImage(editingId)} title="Eliminar imagen"><Trash2 size={14} /></button>
                    )}
                    {selectedImage && (
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setSelectedImage(null); setImagePreview(null); }} title="Cancelar"><X size={14} /></button>
                    )}
                  </div>
                  {selectedImage && <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Nueva imagen: {selectedImage.name}</p>}
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '1.5rem' }}>
                  <Upload size={36} style={{ color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                  <span style={{ fontSize: '0.875rem', color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontWeight: isDragging ? '600' : '400' }}>
                    {isDragging ? 'Suelta la imagen aqui' : 'Arrastra una imagen o haz clic para seleccionar'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>JPEG, PNG o WEBP (max. 10MB)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{ display: 'none' }} data-testid="input-imagen-placa" />
                </label>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" data-testid="btn-guardar" disabled={uploadingImage}>
            {uploadingImage ? 'Subiendo imagen...' : (editingId ? 'Actualizar' : 'Guardar')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default MaquinariaForm;
