import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import argon2 from 'argon2';
import { prisma } from './database-client.mjs';
const url=new URL(process.env.DATABASE_URL??'');
if(process.env.NODE_ENV==='production'||url.pathname!=='/farmsight_dev'||!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Hanya farmsight_dev lokal yang diizinkan.');
const directory=resolve('../tmp'),access=resolve(directory,'uat-access.json');mkdirSync(directory,{recursive:true});
if(existsSync(access))throw new Error('Akses UAT sudah ada. Gunakan file tmp/akses-uji-lokal.txt.');
const accounts=[['SUPER_ADMIN','Super Admin','admin'],['STOCK_MANAGER','Stock Manager','stock'],['SALES_ADMIN','Sales Admin','sales']].map(([code,role,suffix])=>({code,role,email:`uat.${suffix}@example.test`,password:randomBytes(12).toString('base64url')}));
try {
  const hashes=await Promise.all(accounts.map(x=>argon2.hash(`${x.password}\u0000${process.env.PASSWORD_PEPPER}`,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})));
  await prisma.$transaction(async tx=>{
    for(let i=0;i<accounts.length;i++){
      const x=accounts[i];if(await tx.user.findUnique({where:{emailNormalized:x.email}}))throw new Error('Akun UAT sudah ada; tidak ditimpa.');
      const role=await tx.role.upsert({where:{code:x.code},create:{code:x.code,name:x.role},update:{}});
      const user=await tx.user.create({data:{name:`UAT Lokal ${x.role}`,email:x.email,emailNormalized:x.email,passwordHash:hashes[i],roleId:role.id}});
      await tx.auditLog.create({data:{action:'LOCAL_UAT_ACCOUNT_CREATED',targetType:'USER',targetId:user.id}});
    }
    const category=await tx.category.upsert({where:{nameNormalized:'uji lokal'},create:{name:'Uji Lokal',nameNormalized:'uji lokal',slug:'uji-lokal'},update:{}});
    const actor=await tx.user.findUniqueOrThrow({where:{emailNormalized:accounts[0].email}});
    for(const [sku,name,price] of [['UAT-LOKAL-A','Produk Uji Lokal A (data sintetis)',10000],['UAT-LOKAL-B','Produk Uji Lokal B (data sintetis)',15000]]){
      if(await tx.product.findUnique({where:{skuNormalized:sku.toLowerCase()}}))throw new Error('SKU UAT sudah ada; tidak ditimpa.');
      const product=await tx.product.create({data:{sku,skuNormalized:sku.toLowerCase(),name,slug:sku.toLowerCase(),categoryId:category.id,price,stockUnit:'UNIT',minimumStock:5,reorderPoint:8,leadTimeDays:7,description:'Produk sintetis untuk pengujian integrasi lokal. Bukan data produksi.',inventoryBalance:{create:{currentStock:20}}}});
      await tx.stockMovement.create({data:{productId:product.id,type:'ADJUSTMENT_IN',action:'SET_OPENING_BALANCE',quantity:20,stockBefore:0,stockAfter:20,reasonCode:'OPENING_BALANCE',note:'Saldo awal fixture UAT lokal, data sintetis.',idempotencyKey:randomUUID(),payloadHash:randomBytes(32).toString('hex'),actorUserId:actor.id,occurredAt:new Date()}});
      await tx.auditLog.create({data:{actorUserId:actor.id,action:'LOCAL_UAT_PRODUCT_CREATED',targetType:'PRODUCT',targetId:product.id}});
    }
  },{timeout:15000});
  writeFileSync(access,JSON.stringify(accounts.map(({code,...x})=>x),null,2),{mode:0o600});
  writeFileSync(resolve(directory,'akses-uji-lokal.txt'),['AKSES UJI LOKAL FARMSIGHT','Khusus development; jangan dipublikasikan.','',...accounts.map(x=>`${x.role}\nEmail: ${x.email}\nKata sandi: ${x.password}\n`),'URL: http://localhost:5173'].join('\n'),{mode:0o600});
  console.log('Tiga akun dan dua produk sintetis dibuat. Akses tersedia di tmp/akses-uji-lokal.txt.');
}finally{await prisma.$disconnect();}
