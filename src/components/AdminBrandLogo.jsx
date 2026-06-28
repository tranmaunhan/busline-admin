function AdminBrandLogo({
  compact = false,
  subtitle = 'Hệ thống quản trị',
}) {
  return (
    <div className={`brand-logo${compact ? ' compact' : ''}`}>
      <div className="brand-logo-mark" aria-hidden="true">
        <span>SG</span>
      </div>

      <div className="brand-logo-copy">
        <strong>
          SaiGon<span>ST</span>
        </strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
    </div>
  );
}

export default AdminBrandLogo;
