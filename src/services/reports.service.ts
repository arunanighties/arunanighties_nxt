import { db, ordersTable, usersTable, productsTable } from "@workspace/db";
import { sql, and, gte, notInArray } from "drizzle-orm";

export interface MonthlyMetric {
  month: string; // "May 2026"
  revenue: number;
  newProducts: number;
  orders: number;
  newUsers: number;
  yearMonth?: string; // "2026-05" for sorting/grouping
}

export interface SummaryCard {
  value: number;
  percentage: number;
  lastMonth: number;
}

export interface ReportsData {
  summaryCards: {
    revenue: SummaryCard;
    newProducts: SummaryCard;
    orders: SummaryCard;
    newUsers: SummaryCard;
  };
  history: MonthlyMetric[];
}

export class ReportsService {
  static async getMonthlyAnalytics(): Promise<ReportsData> {
    const now = new Date();
    // Start of 5 months ago (to get 6 months total including current)
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Fetch all relevant orders
    const orders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          gte(ordersTable.createdAt, startDate),
          notInArray(sql`lower(${ordersTable.status})`, ["cancelled"])
        )
      );

    // Fetch all relevant users
    const users = await db
      .select()
      .from(usersTable)
      .where(gte(usersTable.createdAt, startDate));

    // Fetch all relevant products
    const products = await db
      .select()
      .from(productsTable)
      .where(gte(productsTable.createdAt, startDate));

    // Initialize 6 months history
    const history: MonthlyMetric[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "long" }).toUpperCase();
      const year = d.getFullYear();
      const yearMonth = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      history.push({
        month: `${monthName} ${year}`,
        revenue: 0,
        newProducts: 0,
        orders: 0,
        newUsers: 0,
        yearMonth,
      });
    }

    // Aggregate orders
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const metric = history.find((h) => h.yearMonth === ym);

      if (metric) {
        metric.revenue += parseFloat(String(order.total || 0));
        metric.orders += 1;
      }
    });

    // Aggregate products
    products.forEach((product) => {
      const date = new Date(product.createdAt);
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const metric = history.find((h) => h.yearMonth === ym);
      if (metric) {
        metric.newProducts += 1;
      }
    });

    // Aggregate users
    users.forEach((user) => {
      const date = new Date(user.createdAt);
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const metric = history.find((h) => h.yearMonth === ym);
      if (metric) {
        metric.newUsers += 1;
      }
    });

    // Sort history by month descending (newest first)
    history.sort((a, b) => (b.yearMonth ?? "").localeCompare(a.yearMonth ?? ""));

    const current = history[0];
    const previous = history[1] || { revenue: 0, newProducts: 0, orders: 0, newUsers: 0 };

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
    };

    return {
      summaryCards: {
        revenue: {
          value: parseFloat(current.revenue.toFixed(2)),
          percentage: calculateChange(current.revenue, previous.revenue),
          lastMonth: parseFloat(previous.revenue.toFixed(2)),
        },
        newProducts: {
          value: current.newProducts,
          percentage: calculateChange(current.newProducts, previous.newProducts),
          lastMonth: previous.newProducts,
        },
        orders: {
          value: current.orders,
          percentage: calculateChange(current.orders, previous.orders),
          lastMonth: previous.orders,
        },
        newUsers: {
          value: current.newUsers,
          percentage: calculateChange(current.newUsers, previous.newUsers),
          lastMonth: previous.newUsers,
        },
      },
      history: history.map(({ yearMonth, ...rest }) => rest), // Remove helper field
    };
  }
}
