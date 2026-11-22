import { POST as handlePost } from "@/app/api/webhook/signal/route";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return handlePost(req);
}
