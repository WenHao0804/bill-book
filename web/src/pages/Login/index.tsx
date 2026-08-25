import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Toast } from 'antd-mobile'
import { listLedgers } from '../../api/ledger'
import { ApiError } from '../../api/client'
import { clearApiKey, setApiKey } from '../../utils/auth'

export default function Login() {
  const navigate = useNavigate()
  const [apiKey, setApiKeyInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const key = apiKey.trim()
    if (!key) {
      Toast.show({ content: '请输入 API Key' })
      return
    }
    setLoading(true)
    setApiKey(key)
    try {
      await listLedgers()
      navigate('/', { replace: true })
    } catch (err) {
      clearApiKey()
      Toast.show({ icon: 'fail', content: err instanceof ApiError ? err.message : '登录失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page login-page">
      <div className="login-blob login-blob--1" />
      <div className="login-blob login-blob--2" />
      <div className="login-blob login-blob--3" />
      <div
        className="page-content"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}
      >
        <div className="login-card">
          <div className="login-logo">
            <img src="/icon.png" alt="一起花" />
          </div>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>一起花</div>
            <div style={{ color: 'var(--adm-color-weak, #888)', marginTop: 12, lineHeight: 1.8, fontSize: 13 }}>
              多人多币种，一起记账
              <br />
              自动换算汇率、一键结算欠款
              <br />
              支出分类报表一目了然
            </div>
          </div>
          <Input
            placeholder="请输入 API Key"
            type="password"
            clearable
            value={apiKey}
            onChange={setApiKeyInput}
            onEnterPress={handleLogin}
            style={{
              fontSize: 16,
              background: '#fff',
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 16,
            }}
          />
          <Button block color="primary" loading={loading} onClick={handleLogin} style={{ borderRadius: 10 }}>
            登录
          </Button>
        </div>
      </div>
    </div>
  )
}
