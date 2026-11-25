#!/usr/bin/env python3
"""
EVOCHRONOS TAURI DESKTOP PACKAGING VERIFICATION SUITE
Verifies:
  1. WebGPU Workbench production build artifacts (dist/index.html, JS/CSS assets)
  2. Tauri 2.0 configuration schema and window capabilities
  3. Canonical application icons (32x32, 128x128, 128x128@2x, icon.icns, icon.ico)
  4. Desktop Rust crate isolation and build script integrity (build.rs, [workspace])
  5. Built macOS desktop application executable / bundle presence
"""

import os
import sys
import json
import unittest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
DESKTOP_DIR = os.path.join(REPO_ROOT, "apps", "desktop")
SRC_TAURI_DIR = os.path.join(DESKTOP_DIR, "src-tauri")
WORKBENCH_DIR = os.path.join(REPO_ROOT, "apps", "workbench")


class TestTauriDesktopPackaging(unittest.TestCase):
    """Test suite for validating the Tauri 2.0 Desktop Workstation packaging."""

    def test_01_workbench_production_dist(self):
        """Verify that the WebGPU workbench production bundle exists and is valid."""
        dist_dir = os.path.join(WORKBENCH_DIR, "dist")
        index_html = os.path.join(dist_dir, "index.html")
        assets_dir = os.path.join(dist_dir, "assets")

        self.assertTrue(os.path.isdir(dist_dir), "Workbench dist directory must exist")
        self.assertTrue(os.path.isfile(index_html), "Workbench dist/index.html must exist")
        self.assertTrue(os.path.isdir(assets_dir), "Workbench dist/assets directory must exist")

        with open(index_html, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("<div id=\"root\"></div>", content)
        self.assertIn("assets/", content)

    def test_02_tauri_configuration(self):
        """Verify tauri.conf.json configuration properties and schema alignment."""
        conf_path = os.path.join(SRC_TAURI_DIR, "tauri.conf.json")
        self.assertTrue(os.path.isfile(conf_path), "tauri.conf.json must exist")

        with open(conf_path, "r", encoding="utf-8") as f:
            conf = json.load(f)

        self.assertEqual(conf.get("productName"), "EvoChronos")
        self.assertEqual(conf.get("identifier"), "org.evochronos.desktop")

        build_cfg = conf.get("build", {})
        self.assertEqual(build_cfg.get("frontendDist"), "../../workbench/dist")

        # Window configuration
        app_cfg = conf.get("app", {})
        windows = app_cfg.get("windows", [])
        self.assertGreaterEqual(len(windows), 1, "Must configure at least one desktop window")
        main_win = windows[0]
        self.assertEqual(main_win.get("label"), "main")
        self.assertIn("EvoChronos", main_win.get("title", ""))
        self.assertGreaterEqual(main_win.get("width", 0), 1024)

    def test_03_tauri_capabilities(self):
        """Verify Tauri 2.0 capabilities and permission declarations."""
        cap_path = os.path.join(SRC_TAURI_DIR, "capabilities", "default.json")
        self.assertTrue(os.path.isfile(cap_path), "capabilities/default.json must exist")

        with open(cap_path, "r", encoding="utf-8") as f:
            cap = json.load(f)

        self.assertEqual(cap.get("identifier"), "default")
        self.assertIn("main", cap.get("windows", []))
        self.assertIn("core:default", cap.get("permissions", []))

    def test_04_icon_assets(self):
        """Verify presence of all required icon sizes and formats for packaging."""
        icons_dir = os.path.join(SRC_TAURI_DIR, "icons")
        self.assertTrue(os.path.isdir(icons_dir), "icons directory must exist")

        required_icons = [
            "32x32.png",
            "128x128.png",
            "128x128@2x.png",
            "icon.png",
            "icon.icns",
            "icon.ico",
        ]
        for icon_name in required_icons:
            icon_path = os.path.join(icons_dir, icon_name)
            self.assertTrue(os.path.isfile(icon_path), f"Required icon asset {icon_name} must exist")
            self.assertGreater(os.path.getsize(icon_path), 0, f"Icon {icon_name} must not be empty")

    def test_05_cargo_manifest_and_build_script(self):
        """Verify that src-tauri defines an isolated workspace and valid build.rs."""
        cargo_path = os.path.join(SRC_TAURI_DIR, "Cargo.toml")
        build_rs_path = os.path.join(SRC_TAURI_DIR, "build.rs")

        self.assertTrue(os.path.isfile(cargo_path), "src-tauri/Cargo.toml must exist")
        self.assertTrue(os.path.isfile(build_rs_path), "src-tauri/build.rs must exist")

        with open(cargo_path, "r", encoding="utf-8") as f:
            cargo_content = f.read()

        self.assertIn("[workspace]", cargo_content)
        self.assertIn("tauri-build", cargo_content)
        self.assertIn("evo-core", cargo_content)
        self.assertIn("evo-server", cargo_content)
        self.assertIn("evo-storage", cargo_content)

    def test_06_desktop_app_bundle_presence(self):
        """Verify that EvoChronos.app bundle is successfully produced with executable and icons."""
        bundle_dirs = [
            os.path.join(SRC_TAURI_DIR, "target", "release", "bundle", "macos", "EvoChronos.app"),
            os.path.join(SRC_TAURI_DIR, "target", "debug", "bundle", "macos", "EvoChronos.app"),
        ]
        found_bundle = None
        for b in bundle_dirs:
            if os.path.isdir(b):
                found_bundle = b
                break

        self.assertIsNotNone(found_bundle, "EvoChronos.app bundle must exist in target bundle directory")
        macos_dir = os.path.join(found_bundle, "Contents", "MacOS")
        resources_dir = os.path.join(found_bundle, "Contents", "Resources")
        bin_path = os.path.join(macos_dir, "evochronos-desktop")
        icon_path = os.path.join(resources_dir, "icon.icns")

        self.assertTrue(os.path.isfile(bin_path), "evochronos-desktop executable must exist")
        self.assertTrue(os.access(bin_path, os.X_OK), "evochronos-desktop must be executable")
        self.assertTrue(os.path.isfile(icon_path), "icon.icns must be bundled in Resources")


if __name__ == "__main__":
    unittest.main()
