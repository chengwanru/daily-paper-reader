import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
import os


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from llm import (
    LLMClient,
    describe_llm_endpoint,
    resolve_llm_api_key,
    resolve_llm_base_url,
    resolve_llm_model,
)


class LlmBaseUrlTest(unittest.TestCase):
    def _mock_response(self):
        resp = MagicMock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "ok",
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 1,
                "completion_tokens": 1,
                "total_tokens": 2,
            },
        }
        return resp

    def test_resolve_llm_base_url_prefers_primary(self):
        with patch.dict(
            os.environ,
            {
                "LLM_PRIMARY_BASE_URL": "https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
                "SUMMARY_BASE_URL": "https://summary.example.com/v1",
                "DEEPSEEK_BASE_URL": "https://api.deepseek.com",
            },
            clear=True,
        ):
            self.assertEqual(
                resolve_llm_base_url(),
                "https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
            )
            self.assertIn("maas.aliyuncs.com", describe_llm_endpoint())
            self.assertEqual(resolve_llm_api_key(), "")
            self.assertEqual(resolve_llm_model("fallback"), "fallback")

    @patch("llm.requests.post")
    def test_chat_auth_error_fails_without_retrying_other_bases(self, mock_post):
        resp = MagicMock()
        resp.status_code = 401
        resp.json.return_value = {
            "error": {
                "message": "Authentication Fails, Your api key is invalid",
                "type": "authentication_error",
            }
        }
        err = Exception("401 Client Error: Authorization Required")
        err.response = resp
        resp.raise_for_status.side_effect = err
        mock_post.return_value = resp

        client = LLMClient(
            api_key="bad-key",
            model="deepseek-v4-flash",
            base_url="https://api.deepseek.com,https://fallback.invalid",
        )

        with self.assertRaises(Exception):
            client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(mock_post.call_count, 1)

    @patch("llm.requests.post")
    def test_chat_appends_v1_when_base_is_root(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://api.openai.com/v1/chat/completions",
        )

    @patch("llm.requests.post")
    def test_chat_keeps_versioned_base(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com/v1",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://api.openai.com/v1/chat/completions",
        )

    @patch("llm.requests.post")
    def test_chat_uses_full_endpoint_directly(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="test-key",
            model="gpt-4.1-mini",
            base_url="https://api.openai.com/v1/chat/completions",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://api.openai.com/v1/chat/completions",
        )

    @patch("llm.requests.post")
    def test_chat_keeps_aliyun_maas_compatible_mode_base(self, mock_post):
        mock_post.return_value = self._mock_response()
        client = LLMClient(
            api_key="sk-ws-test",
            model="deepseek-v3",
            base_url="https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
        )

        client.chat([{"role": "user", "content": "hello"}])

        self.assertEqual(
            mock_post.call_args.args[0],
            "https://ws-demo.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
        )


if __name__ == "__main__":
    unittest.main()
