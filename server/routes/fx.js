// server/routes/fx.js
// API для курсов валют (NBKR)

import { z } from "zod";
import { sql } from "drizzle-orm";
import https from "https";
import xml2js from "xml2js";

// In-memory кэш
let fxCache = {
  data: null,
  fetchedAt: null,
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут

// Парсинг XML с NBKR
async function fetchNBKRRates() {
  return new Promise((resolve, reject) => {
    const url = "https://www.nbkr.kg/XML/daily.xml";
    
    https.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", async () => {
        try {
          const parser = new xml2js.Parser({ explicitArray: false });
          const result = await parser.parseStringPromise(data);
          
          const root = result.CurrencyRates;
          const fxDate = root?.$?.Date || null;
          const currencies = root?.Currency || [];
          
          let usdKgs = null;
          let cnyKgs = null;
          
          for (const curr of currencies) {
            if (curr.ISocode === "USD") {
              usdKgs = parseFloat(curr.Value.replace(",", "."));
            }
            if (curr.ISocode === "CNY") {
              cnyKgs = parseFloat(curr.Value.replace(",", "."));
            }
          }
          
          if (!usdKgs || !cnyKgs) {
            reject(new Error("Required currencies not found in NBKR response"));
            return;
          }
          
          resolve({
            source: "NBKR",
            date: fxDate,
            usdKgs,
            cnyKgs,
            fetchedAt: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", (err) => {
      reject(err);
    }).on("timeout", () => {
      reject(new Error("NBKR request timeout"));
    });
  });
}

// Получение курсов с кэшированием
async function getFXRates() {
  const now = Date.now();
  
  // Проверяем кэш
  if (fxCache.data && fxCache.fetchedAt && (now - fxCache.fetchedAt) < CACHE_TTL_MS) {
    return {
      ...fxCache.data,
      cached: true,
    };
  }
  
  // Запрашиваем новые данные
  try {
    const data = await fetchNBKRRates();
    fxCache = {
      data,
      fetchedAt: now,
    };
    return {
      ...data,
      cached: false,
    };
  } catch (err) {
    console.error("NBKR fetch failed:", err.message);
    
    // Если ошибка и есть stale кэш - возвращаем его
    if (fxCache.data) {
      return {
        ...fxCache.data,
        cached: true,
        stale: true,
      };
    }
    
    // Fallback: фиксированные курсы (примерные)
    const fallbackDate = new Date().toISOString().split('T')[0].split('-').reverse().join('.');
    return {
      source: "NBKR_FALLBACK",
      date: fallbackDate,
      usdKgs: 87.5,
      cnyKgs: 12.1,
      fetchedAt: new Date().toISOString(),
      fallback: true,
      cached: false,
    };
  }
}

export default async function fxRoutes(app) {
  // GET /api/fx/latest - текущие курсы
  app.get("/latest", async (req, reply) => {
    try {
      const rates = await getFXRates();
      return rates;
    } catch (err) {
      console.error("FX fetch error:", err);
      // Возвращаем fallback вместо ошибки
      const fallbackDate = new Date().toISOString().split('T')[0].split('-').reverse().join('.');
      return {
        source: "NBKR_FALLBACK",
        date: fallbackDate,
        usdKgs: 87.5,
        cnyKgs: 12.1,
        fetchedAt: new Date().toISOString(),
        fallback: true,
        cached: false,
      };
    }
  });
  
  // GET /api/fx/convert - конвертация суммы
  app.get("/convert", async (req, reply) => {
    const schema = z.object({
      amount: z.string().regex(/^\d+(\.\d+)?$/),
      from: z.enum(["KGS", "USD", "CNY"]),
      to: z.enum(["KGS", "USD", "CNY"]).default("USD"),
    });
    
    try {
      const { amount, from, to } = schema.parse(req.query);
      const rates = await getFXRates();
      
      const amt = parseFloat(amount);
      let result = amt;
      
      // Конвертируем в USD
      if (from === "KGS") {
        result = amt / rates.usdKgs;
      } else if (from === "CNY") {
        result = (amt * rates.cnyKgs) / rates.usdKgs;
      } else if (from === "USD") {
        result = amt;
      }
      
      // Если нужно не в USD, конвертируем дальше
      if (to === "KGS") {
        result = result * rates.usdKgs;
      } else if (to === "CNY") {
        result = (result * rates.usdKgs) / rates.cnyKgs;
      }
      
      return {
        amount: amt,
        from,
        to,
        result: Math.round(result * 100) / 100,
        rate: {
          usdKgs: rates.usdKgs,
          cnyKgs: rates.cnyKgs,
          date: rates.date,
        },
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.badRequest("Invalid parameters");
      }
      console.error("FX convert error:", err);
      return reply.status(503).send({
        error: "FX_UNAVAILABLE",
        message: "Не удалось выполнить конвертацию. Попробуйте позже.",
      });
    }
  });
}
