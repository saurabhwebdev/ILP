<Button 
  variant="outline"
  size="sm"
  onClick={fetchTruckAssignments}
  className="flex items-center gap-1"
  disabled={loading || saving}
>
  <RefreshCw size={16} />
</Button> 