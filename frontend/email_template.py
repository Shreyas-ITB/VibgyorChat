# utils/email_templates.py

EMAIL_VERIFICATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VibgyorChat - Email Verification</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
    <!-- Animated Background -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);min-height:100vh;">
        <tr>
            <td align="center" style="padding:40px 20px;">
                <!-- Main Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:rgba(17, 24, 39, 0.95);border:1px solid rgba(75, 85, 99, 0.3);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);backdrop-filter:blur(10px);overflow:hidden;">
                    
                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);padding:40px 30px;text-align:center;border-bottom:1px solid rgba(75, 85, 99, 0.3);">
                            <!-- Logo/Icon -->
                            <div style="width:80px;height:80px;margin:0 auto 20px;background:linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);border-radius:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(59, 130, 246, 0.3);">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h1 style="margin:0;font-size:32px;font-weight:700;background:linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">VibgyorChat</h1>
                            <p style="margin:10px 0 0;font-size:14px;color:#9ca3af;letter-spacing:0.5px;">Secure Communication Platform</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#f9fafb;">Email Verification</h2>
                            <p style="margin:0 0 30px;font-size:15px;line-height:1.6;color:#d1d5db;">
                                Welcome to VibgyorChat! To complete your login, please use the verification code below:
                            </p>
                            
                            <!-- OTP Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                                <tr>
                                    <td align="center">
                                        <div style="display:inline-block;background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);border:2px solid rgba(59, 130, 246, 0.5);border-radius:12px;padding:30px 40px;box-shadow:0 0 30px rgba(59, 130, 246, 0.2),inset 0 0 20px rgba(59, 130, 246, 0.1);">
                                            <p style="margin:0 0 10px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Your Verification Code</p>
                                            <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#60a5fa;text-shadow:0 0 20px rgba(96, 165, 250, 0.5);">{{OTP}}</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Info Box -->
                            <div style="background:rgba(59, 130, 246, 0.1);border-left:4px solid #3b82f6;border-radius:8px;padding:20px;margin:30px 0;">
                                <p style="margin:0;font-size:14px;line-height:1.6;color:#d1d5db;">
                                    <strong style="color:#60a5fa;">⏱️ Valid for 10 minutes</strong><br>
                                    This code will expire in 10 minutes for security reasons.
                                </p>
                            </div>
                            
                            <p style="margin:30px 0 0;font-size:14px;line-height:1.6;color:#9ca3af;">
                                If you didn't request this verification code, please ignore this email. Your account remains secure.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                        <td style="background:rgba(239, 68, 68, 0.1);border-top:1px solid rgba(239, 68, 68, 0.2);padding:20px 30px;">
                            <p style="margin:0;font-size:13px;line-height:1.6;color:#fca5a5;">
                                <strong style="color:#ef4444;">🔒 Security Reminder:</strong> Never share this code with anyone. VibgyorChat staff will never ask for your verification code.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background:#0f172a;border-top:1px solid rgba(75, 85, 99, 0.3);padding:30px;text-align:center;">
                            <p style="margin:0 0 15px;font-size:13px;color:#6b7280;">
                                Need help? Contact us at <a href="mailto:support@vibgyorchat.com" style="color:#60a5fa;text-decoration:none;">support@vibgyorchat.com</a>
                            </p>
                            <div style="margin:20px 0;height:1px;background:rgba(75, 85, 99, 0.3);"></div>
                            <p style="margin:0;font-size:12px;color:#6b7280;">
                                © {{YEAR}} VibgyorChat. All rights reserved.
                            </p>
                            <p style="margin:10px 0 0;font-size:11px;color:#4b5563;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Bottom Spacing -->
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:20px;">
                    <tr>
                        <td align="center" style="padding:20px;">
                            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                                You're receiving this email because you attempted to log in to VibgyorChat.<br>
                                If this wasn't you, please secure your account immediately.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
