<Button 
  variant="outline"
  size="sm"
  onClick={fetchDockSettings}
  className="flex items-center gap-1"
  disabled={loading || saving}
>
  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
  <span>Refresh Data</span>
</Button> 