import mysql from 'mysql2/promise';
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../lib/db/src/schema/index.js";
import { productsTable, categoriesTable } from "../lib/db/src/schema/index.js";

const databaseUrl = process.env.DATABASE_URL;

async function seed() {
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  // Extract connection info to create database if not exists
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);
  const baseUrl = `${url.protocol}//${url.username}${url.password ? `:${url.password}` : ''}@${url.host}`;

  try {
    const rootConn = await mysql.createConnection(baseUrl);
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database ${dbName} ensured`);
    await rootConn.end();
  } catch (err) {
    console.warn(`Could not ensure database ${dbName} exists via root (this is fine if it already exists):`, err.message);
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection, { schema, mode: "default" });

  console.log("Seeding started...");

  // Add Categories
  const categories = [
    { name: "Premium Satin", description: "Elegant satin sleepwear for ultimate luxury.", icon: "✨" },
    { name: "Classic Cotton", description: "Breathable and comfortable cotton nighties.", icon: "🌿" },
    { name: "Silk & Lace", description: "Sophisticated silk designs with delicate lace trims.", icon: "🎀" },
    { name: "Activewear", description: "Performance-focused activewear for your daily movement.", icon: "🧘" }
  ];

  for (const cat of categories) {
    await db.insert(categoriesTable).ignore().values(cat);
  }

  const [dbCats] = await connection.query('SELECT id, name FROM categories');
  const catMap = Object.fromEntries(dbCats.map(c => [c.name, c.id]));

  // Add Products
  const products = [
    {
      name: "Signature Satin Long Nighty",
      description: "Indulge in pure elegance with our Signature Satin Long Nighty. Crafted from high-grade satin with a lustrous sheen, this nighty offers a fluid drape that flatters every curve. The adjustable spaghetti straps and deep V-neckline add a touch of allure, while the side slit ensures effortless movement.",
      price: "1299.00",
      mrp: "1599.00",
      imageUrl: "https://images.unsplash.com/photo-1598554889165-8139a49f2883?auto=format&fit=crop&q=80&w=800",
      stock: 50,
      categoryId: catMap["Premium Satin"],
      rating: "4.8",
      reviewCount: 124,
      reviewText: "Absolutely stunning! The satin feels incredibly soft and high-quality.",
      images: ["https://images.unsplash.com/photo-1598554889165-8139a49f2883?auto=format&fit=crop&q=80&w=800"],
      sizes: [{ size: "S", quantity: 15 }, { size: "M", quantity: 20 }, { size: "L", quantity: 15 }]
    },
    {
      name: "Lace Trim Silk Chemise",
      description: "Sophistication meets comfort in our Lace Trim Silk Chemise. Made from 100% pure mulberry silk, it provides a temperature-regulating sleep experience. The delicate French lace trim along the hem and neckline provides a romantic finish, making it perfect for both sleep and lounging.",
      price: "1899.00",
      mrp: "2499.00",
      imageUrl: "https://images.unsplash.com/photo-1590736704728-f4730bb3c3af?auto=format&fit=crop&q=80&w=800",
      stock: 35,
      categoryId: catMap["Silk & Lace"],
      rating: "4.9",
      reviewCount: 86,
      reviewText: "The best chemise I've ever owned. Worth every penny.",
      images: ["https://images.unsplash.com/photo-1590736704728-f4730bb3c3af?auto=format&fit=crop&q=80&w=800"],
      sizes: [{ size: "M", quantity: 15 }, { size: "L", quantity: 20 }]
    },
    {
      name: "Floral Print Cotton Nightgown",
      description: "Enjoy a restful night's sleep in our Floral Print Cotton Nightgown. Breathable, lightweight, and made from 100% organic cotton, it's designed for all-season comfort. Featuring a charming hand-drawn floral print and a relaxed fit, it's as beautiful as it is practical.",
      price: "899.00",
      mrp: "1199.00",
      imageUrl: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&q=80&w=800",
      stock: 100,
      categoryId: catMap["Classic Cotton"],
      rating: "4.6",
      reviewCount: 210,
      reviewText: "Very soft cotton, and the print is even prettier in person.",
      images: ["https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&q=80&w=800"],
      sizes: [{ size: "S", quantity: 25 }, { size: "M", quantity: 35 }, { size: "L", quantity: 40 }]
    },
    {
      name: "Luxury Velvet Robe",
      description: "Wrap yourself in luxury with our plush Velvet Robe. Perfect for those chilly mornings or relaxing evenings, this robe features a soft, high-pile velvet exterior and a cozy jersey lining. With deep pockets and a wide waist tie, it offers both functionality and unmatched comfort.",
      price: "2499.00",
      mrp: "3299.00",
      imageUrl: "https://images.unsplash.com/photo-1590736910118-8700206114e9?auto=format&fit=crop&q=80&w=800",
      stock: 25,
      categoryId: catMap["Premium Satin"],
      rating: "4.7",
      reviewCount: 54,
      reviewText: "So cozy and luxurious! Makes me feel like I'm at a spa.",
      images: ["https://images.unsplash.com/photo-1590736910118-8700206114e9?auto=format&fit=crop&q=80&w=800"],
      sizes: [{ size: "Free Size", quantity: 25 }]
    },
    {
      name: "Seamless Microfiber Shorts",
      description: "Our Seamless Microfiber Shorts are a game-changer for daily comfort. Engineered with a 360-degree stretch fabric, these shorts offer a smooth, invisible look under any outfit. The moisture-wicking material ensures you stay dry and fresh all day, whether you're working out or running errands.",
      price: "499.00",
      mrp: "699.00",
      imageUrl: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=800",
      stock: 150,
      categoryId: catMap["Activewear"],
      rating: "4.5",
      reviewCount: 342,
      reviewText: "Super comfortable and they don't ride up at all.",
      images: ["https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=800"],
      sizes: [{ size: "S", quantity: 40 }, { size: "M", quantity: 60 }, { size: "L", quantity: 50 }]
    },
    {
      name: "High-Waist Yoga Shorts",
      description: "Elevate your workout with our High-Waist Yoga Shorts. The subtle mesh details offer comfort and breathability without sacrificing style. Perfect for low to high impact workouts, they feature a second-skin feel and non-slip design. Discover the ultimate versatility and support in these activewear must-haves.",
      price: "699.00",
      mrp: "999.00",
      imageUrl: "https://images.unsplash.com/photo-1591195853730-449bc700940b?auto=format&fit=crop&q=80&w=800",
      stock: 80,
      categoryId: catMap["Activewear"],
      rating: "4.7",
      reviewCount: 156,
      reviewText: "Great fit and the mesh detail is a nice touch.",
      images: ["https://images.unsplash.com/photo-1591195853730-449bc700940b?auto=format&fit=crop&q=80&w=800"],
      sizes: [{ size: "S", quantity: 20 }, { size: "M", quantity: 30 }, { size: "L", quantity: 30 }]
    }
  ];

  for (const product of products) {
    await db.insert(productsTable).values(product);
  }

  console.log("Seeding completed successfully!");
  await connection.end();
}

seed();
