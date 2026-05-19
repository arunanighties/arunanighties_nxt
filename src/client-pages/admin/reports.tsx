import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, IndianRupee, Tag, ShoppingCart, Users, 
  TrendingUp, TrendingDown, Loader2, Calendar
} from "lucide-react";
import { getApiBase } from "@/lib/api-config";

interface Metric {
  value: number;
  percentage: number;
  lastMonth: number;
}

interface MonthlyMetric {
  month: string;
  revenue: number;
  newProducts: number;
  orders: number;
  newUsers: number;
}

interface ReportsData {
  summaryCards: {
    revenue: Metric;
    newProducts: Metric;
    orders: Metric;
    newUsers: Metric;
  };
  history: MonthlyMetric[];
}

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery<ReportsData>({
    queryKey: ["admin-reports-monthly"],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/admin/reports/monthly`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-100">
        <p className="font-bold">Failed to load analytics data</p>
        <p className="text-sm">{(error as Error)?.message}</p>
      </div>
    );
  }

  const { summaryCards, history } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-rose-900">Monthly Reports</h1>
          <p className="text-rose-500 text-sm mt-1">Detailed performance metrics for the last 6 months.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          label="REVENUE"
          value={`₹${(summaryCards?.revenue?.value || 0).toLocaleString("en-IN")}`}
          lastMonth={`₹${(summaryCards?.revenue?.lastMonth || 0).toLocaleString("en-IN")}`}
          percentage={summaryCards?.revenue?.percentage || 0}
          icon={IndianRupee}
          color="bg-orange-500"
        />
        <SummaryCard 
          label="NEW PRODUCTS"
          value={summaryCards?.newProducts?.value ?? (summaryCards as any)?.itemsSold?.value ?? 0}
          lastMonth={summaryCards?.newProducts?.lastMonth ?? (summaryCards as any)?.itemsSold?.lastMonth ?? 0}
          percentage={summaryCards?.newProducts?.percentage ?? (summaryCards as any)?.itemsSold?.percentage ?? 0}
          icon={Tag}
          color="bg-emerald-500"
        />
        <SummaryCard 
          label="ORDERS"
          value={summaryCards?.orders?.value || 0}
          lastMonth={summaryCards?.orders?.lastMonth || 0}
          percentage={summaryCards?.orders?.percentage || 0}
          icon={ShoppingCart}
          color="bg-amber-500"
        />
        <SummaryCard 
          label="NEW USERS"
          value={summaryCards?.newUsers?.value || 0}
          lastMonth={summaryCards?.newUsers?.lastMonth || 0}
          percentage={summaryCards?.newUsers?.percentage || 0}
          icon={Users}
          color="bg-blue-500"
        />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2rem] border border-pink-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-pink-50 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-rose-900">Monthly Performance History</h2>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">Comparison of last 6 months metrics</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-pink-50/30">
                <th className="px-8 py-4 text-left text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">Month</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">Revenue</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">Orders</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">New Products</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em]">New Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {history.map((row) => (
                <tr key={row.month} className="hover:bg-pink-50/20 transition-colors">
                  <td className="px-8 py-6 font-bold text-rose-900 text-sm">{row.month}</td>
                  <td className="px-8 py-6 font-bold text-rose-900 text-sm">₹{row.revenue.toLocaleString("en-IN")}</td>
                  <td className="px-8 py-6 text-rose-500 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {row.orders}
                      <div className="h-1.5 w-16 bg-pink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-200" style={{ width: `${Math.min(100, (row.orders / (summaryCards?.orders?.value || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-rose-500 text-sm font-medium">{row.newProducts}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1.5 text-rose-400 text-sm font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {row.newUsers}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, percentage, lastMonth, icon: Icon, color }: any) {
  const isPositive = percentage >= 0;
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-pink-100 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-8">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? "↗" : "↘"} {Math.abs(percentage)}%
        </div>
      </div>
      
      <p className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-4xl font-bold text-rose-900 font-serif mb-6">{value}</p>
      
      <div className="pt-4 border-t border-pink-50 flex justify-between items-center">
        <span className="text-[9px] font-bold text-rose-300 uppercase tracking-widest">Last Month</span>
        <span className="text-[11px] font-bold text-rose-900">{lastMonth}</span>
      </div>
    </div>
  );
}
