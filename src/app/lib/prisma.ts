import "dotenv/config";
import dns from "node:dns";

// Fix Node.js ETIMEDOUT when resolving dual-stack IPv6/IPv4 addresses on networks without working IPv6 routes
dns.setDefaultResultOrder("ipv4first");
const originalLookup = dns.lookup;
(dns.lookup as any) = (hostname: any, options: any, cb: any) => {
    if (typeof options === "function") {
        cb = options;
        options = {};
    }
    if (typeof options === "number") {
        options = { family: options };
    }
    return originalLookup(hostname, { ...options, family: 4 }, cb);
};

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };

