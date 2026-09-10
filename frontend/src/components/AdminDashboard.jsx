import { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>

        <p className="text-gray-500 mt-1">Manage users and complaints</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Total Users</p>

          <h2 className="text-3xl font-bold mt-2">{stats.totalUsers}</h2>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Active Users</p>

          <h2 className="text-3xl font-bold mt-2">{stats.activeUsers}</h2>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Blocked Users</p>

          <h2 className="text-3xl font-bold mt-2">{stats.blockedUsers}</h2>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Total Complaints</p>

          <h2 className="text-3xl font-bold mt-2">{stats.totalComplaints}</h2>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Pending Complaints</p>

          <h2 className="text-3xl font-bold mt-2">
            {stats.pendingComplaints}
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-gray-500">Resolved Complaints</p>

          <h2 className="text-3xl font-bold mt-2">
            {stats.resolvedComplaints}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
