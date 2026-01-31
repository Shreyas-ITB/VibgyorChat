# utils/email_templates.py

EMAIL_VERIFICATION_TEMPLATE = """
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f7f8;font-family:Segoe UI,Arial;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="600" style="background:#ffffff;border-radius:10px;padding:30px;">
            <tr>
              <td align="center">
                <h1 style="color:#22c55e;margin:0;">Vibgyor Chats</h1>
                <p style="color:#6b7280;margin-top:8px;">
                  Secure login verification
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 0;">
                <p style="font-size:15px;color:#374151;">
                  Use the OTP below to continue logging in:
                </p>

                <div style="
                  margin:20px 0;
                  padding:20px;
                  background:#fff7ed;
                  border-radius:8px;
                  text-align:center;
                  font-size:36px;
                  letter-spacing:6px;
                  font-weight:700;
                  color:#f97316;
                ">
                  {{OTP}}
                </div>

                <p style="font-size:14px;color:#6b7280;">
                  This OTP is valid for <strong>10 minutes</strong>.
                  If you didn’t request this, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="font-size:12px;color:#9ca3af;">
                © {{YEAR}} Vibgyor. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
