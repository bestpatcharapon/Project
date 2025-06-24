import { PrismaClient } from "@/lib/generated/prisma";
import { type NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("=== EMAIL API GET REQUEST ===");
    console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
    console.log("DATABASE_URL preview:", process.env.DATABASE_URL?.substring(0, 50) + "...");
    
    // Test database connection
    console.log("Testing database connection...");
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection test result:", result);
    
    console.log("Attempting to fetch emails from database...");
    const emails = await prisma.email.findMany({
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log("Successfully fetched emails:", emails.length);
    console.log("Email data:", JSON.stringify(emails, null, 2));
    
    // If no emails exist, let's create a sample one for testing
    if (emails.length === 0) {
      console.log("No emails found, creating sample email...");
      const sampleEmail = await prisma.email.create({
        data: {
          email: "test@example.com"
        }
      });
      console.log("Created sample email:", sampleEmail);
      
      // Fetch again after creating sample
      const updatedEmails = await prisma.email.findMany({
        orderBy: {
          id: 'asc'
        }
      });
      console.log("Updated email list:", updatedEmails);
      return NextResponse.json(updatedEmails);
    }
    
    return NextResponse.json(emails);
  } catch (error) {
    console.error("=== EMAIL API ERROR ===");
    console.error("Error fetching emails:", error);
    
    let errorMessage = "Failed to fetch emails";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : "Unknown error"
    }, { status: 500 });
  }
}

interface EmailPayload {
    id?: number;
    email: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: EmailPayload[] = await request.json();

        const currentEmails = await prisma.email.findMany();
        const currentEmailMap = new Map(currentEmails.map(e => [e.id, e.email]));
        const payloadEmailMap = new Map(body.filter(e => e.id).map(e => [e.id, e.email]));

        // --- START: Input Validation ---
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: "Request body must be an array of emails" }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = body.filter(e => e.email && !emailRegex.test(e.email));
        if (invalidEmails.length > 0) {
            return NextResponse.json({ error: `Invalid email format for: ${invalidEmails.map(e => e.email).join(", ")}` }, { status: 400 });
        }
        // --- END: Input Validation ---


        const emailsToDelete = currentEmails
            .filter(e => !payloadEmailMap.has(e.id))
            .map(e => e.id);

        const emailsToUpdate = body
            .filter(e => e.id && currentEmailMap.has(e.id) && currentEmailMap.get(e.id) !== e.email);

        const emailsToCreate = body
            .filter(e => !e.id && e.email);
        
        await prisma.$transaction(async (tx) => {
            if (emailsToDelete.length > 0) {
                await tx.email.deleteMany({
                    where: { id: { in: emailsToDelete } },
                });
            }

            for (const email of emailsToUpdate) {
                if(email.id) {
                    await tx.email.update({
                        where: { id: email.id },
                        data: { email: email.email },
                    });
                }
            }

            if (emailsToCreate.length > 0) {
                await tx.email.createMany({
                    data: emailsToCreate.map(e => ({ email: e.email })),
                });
            }
        });

        const updatedEmails = await prisma.email.findMany({
          orderBy: {
            id: 'asc'
          }
        });
        
        return NextResponse.json({
            success: true,
            message: "Emails updated successfully",
            data: updatedEmails,
        });

    } catch (error) {
        console.error("Error updating emails:", error);
        return NextResponse.json({ error: "Failed to update emails" }, { status: 500 });
    }
} 