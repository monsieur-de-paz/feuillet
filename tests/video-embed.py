#!/usr/bin/env python3
"""Exercise video resolution and the HTML embed boundary in a disposable install."""
import html
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("video_smoke", pathlib.Path(__file__).with_name("smoke.py"))
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)


class VideoEmbeds(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        harness.Integration.setUpClass()
        cls.admin = harness.Integration.admin
        cls.visitor = harness.Integration.visitor

    @classmethod
    def tearDownClass(cls):
        harness.Integration.tearDownClass()

    def check(self, result, status=200):
        self.assertEqual(result[0], status, result[1])
        return result[1]

    def test_video_sources_and_invalid_inputs(self):
        cases = {
            "https://youtu.be/M7lc1UVf-VE?t=18": "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?start=18",
            "https://www.youtube.com/shorts/M7lc1UVf-VE": "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
            "https://www.dailymotion.com/video/x84sh87": "https://geo.dailymotion.com/player/xc394.html?video=x84sh87",
            "https://dai.ly/x84sh87": "https://geo.dailymotion.com/player/xc394.html?video=x84sh87",
            "https://geo.dailymotion.com/player/x8lr5.html?video=x84sh87": "https://geo.dailymotion.com/player/x8lr5.html?video=x84sh87",
            "https://vimeo.com/12345678/abcdef1234": "https://player.vimeo.com/video/12345678?h=abcdef1234",
            "https://www.tiktok.com/@scout2015/video/6718335390845095173": "https://www.tiktok.com/player/v1/6718335390845095173",
            "https://media.example.test/demo.mp4?key=sample": "https://media.example.test/demo.mp4?key=sample",
        }
        for url, expected in cases.items():
            with self.subTest(url=url):
                self.assertEqual(self.check(self.admin.api("video_resolve", {"url": url}))["video"]["src"], expected)
        for url in ["javascript:alert(1)", "https://youtube.com@example.test/watch?v=M7lc1UVf-VE",
                    "https://www.youtube.com.example.test/watch?v=M7lc1UVf-VE", "https://example.test/page",
                    "https://www.youtube.com/watch?v[]=M7lc1UVf-VE"]:
            self.check(self.admin.api("video_resolve", {"url": url}), 400)
        self.check(self.admin.api("video_resolve", {"url": next(iter(cases))}, authenticated=False), 403)
        self.check(self.visitor.api("video_resolve", {"url": next(iter(cases))}), 401)

    def test_published_player_is_immediate_and_html_stays_inert(self):
        code = '<script>document.body.dataset.example = "loaded"</script><p>Contenu</p>'
        blocks = [
            {"type": "webVideo", "attrs": {"url": "https://youtu.be/M7lc1UVf-VE", "src": "https://example.test/forged"}},
            {"type": "htmlEmbed", "attrs": {"code": code, "height": 9999}},
        ]
        page = self.check(self.admin.api("save", {
            "title": "Embeds", "content": {"type": "doc", "content": blocks}
        }))["page"]
        self.assertEqual(page["content"]["content"][1]["attrs"]["height"], 1200)
        self.check(self.visitor.request("index.php?read=1&page=" + page["id"]), 404)
        self.check(self.admin.api("publish", {"id": page["id"], "version": page["version"]}))
        result = self.visitor.request("index.php?read=1&page=" + page["id"])
        reader = self.check(result).decode()
        self.assertIn('src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE" loading="eager"', reader)
        self.assertIn(html.escape(code), reader)
        self.assertEqual(reader.count("<iframe"),1)
        self.assertNotIn("autoplay=1", reader)
        self.assertNotIn(code, reader)
        self.assertNotIn("example.test/forged", reader)
        self.assertIn("https://www.tiktok.com", result[2]["Content-Security-Policy"])
        shell = self.visitor.request("embed-frame.php")
        self.check(shell)
        self.assertIn("sandbox allow-scripts allow-forms;", shell[2]["Content-Security-Policy"])
        self.assertNotIn("allow-same-origin", shell[2]["Content-Security-Policy"])


if __name__ == "__main__":
    unittest.main(argv=[__file__, *harness.REMAINING], verbosity=2)
