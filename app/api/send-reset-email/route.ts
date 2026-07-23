import { NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Chave RESEND_API_KEY não configurada no servidor." }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const { email } = await req.json()
    const targetEmail = email || "flavio.adsv@gmail.com"

    const data = await resend.emails.send({
      from: "Octho Gestão <onboarding@resend.dev>",
      to: [targetEmail],
      subject: "Octho — Instruções de Redefinição de Senha",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0F6FFF; font-size: 24px; font-weight: 800; margin: 0;">Octho</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Gestão de Tarefas & Horas</p>
          </div>
          <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">Olá,</p>
          <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">Recebemos uma solicitação de redefinição de senha para a conta <strong>${targetEmail}</strong>.</p>
          <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">Para cadastrar sua nova senha com segurança, acesse a aba <strong>"Registre-se"</strong> no aplicativo com este mesmo e-mail.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Se você não solicitou este e-mail, nenhuma ação é necessária.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao enviar e-mail via Resend" }, { status: 500 })
  }
}
