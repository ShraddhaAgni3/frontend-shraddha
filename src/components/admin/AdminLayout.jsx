const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 overflow-auto min-w-0">
        {/* Header यहाँ आएगा */}
        <AdminHeader />
        {/* Nested routes के लिए outlet */}
        <Outlet />
      </div>
    </div>
  );
};