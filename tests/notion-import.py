#!/usr/bin/env python3
"""Regression checks for importing an exported Notion page tree."""
import io
import unittest
import zipfile
import smoke


def html(title, body):
    return f'<article><header><div class="page-header-icon"><span class="icon" data-emoji="🤖"></span></div><h1 class="page-title">{title}</h1></header><div class="page-body">{body}</div></article>'


def archive(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path, contents in entries.items():
            bundle.writestr(path, contents if isinstance(contents, bytes) else contents.encode())
    return output.getvalue()


class NotionImport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        smoke.Integration.setUpClass()
        cls.admin = smoke.Integration.admin
        cls.visitor = smoke.Integration.visitor

    @classmethod
    def tearDownClass(cls):
        smoke.Integration.tearDownClass()

    def response(self, result, status=200):
        self.assertEqual(result[0], status, result[1])
        return result[1]

    def import_zip(self, entries, status=200):
        return self.response(self.admin.upload('import_document', 'export.zip', archive(entries)), status)

    def test_tree_attachments_and_public_reader(self):
        content = '''
        <figure class="callout"><div><span class="icon" data-emoji="💡"></span></div><div>
        <p><strong><mark class="highlight-red">Bloc à lire</mark></strong></p></div></figure>
        <ul class="toggle"><li><details><summary><h1>Section</h1></summary>
        <ul class="toggle"><li><details><summary><h2>Niveau deux</h2></summary>
        <figure class="link-to-page"><a href="Racine/Pr%C3%A9paration.html">Préparation</a></figure>
        </details></li></ul></details></li></ul>
        <figure><div class="source"><a href="Racine/support.txt" data-notion-file="Racine/support.txt" data-notion-file-alias="support.txt">Le document</a></div></figure>
        <figure class="pdf"><a href="Racine/absent.pdf">absent.pdf</a></figure>
        <p><a href="javascript:blocked()">Texte conservé</a></p><script>Ignore this script</script>
        '''
        root = self.import_zip({
            'Racine.html': html('Activité de test', content),
            'Racine/Préparation.html': html('Préparation', '<p>Contenu enfant</p>'),
            'Racine/support.txt': 'Pièce jointe du test'.encode(),
        })['page']
        self.assertEqual((root['visibility'], root['icon']), ('private', '🤖'))
        callout, top, attached, missing, paragraph = root['content']['content']
        self.assertEqual((callout['type'], callout['attrs']['icon']), ('callout', '💡'))
        marks = callout['content'][0]['content'][0]['marks']
        self.assertEqual({m['type'] for m in marks}, {'bold', 'textStyle'})
        self.assertEqual((top['type'], top['content'][0]['attrs']['level']), ('toggleHeading', 1))
        child_toggle = top['content'][1]
        self.assertEqual((child_toggle['type'], child_toggle['content'][0]['attrs']['level']), ('toggleHeading', 2))
        child_id = child_toggle['content'][1]['attrs']['pageId']
        child = self.response(self.admin.api('page', query='&id=' + child_id))['page']
        self.assertEqual((child['title'], child['parent_id'], child['visibility']), ('Préparation', root['id'], 'private'))
        self.response(self.visitor.api('page', query='&id=' + child_id), 404)
        self.assertEqual(self.response(self.admin.request('media.php?id=' + attached['attrs']['fileId'])), 'Pièce jointe du test'.encode())
        self.assertEqual((missing['type'], missing['attrs']['name'], missing['attrs']['fileId']), ('fileBlock', 'absent.pdf', ''))
        self.assertNotIn('marks', paragraph['content'][0])
        self.response(self.admin.api('publish', {'id': root['id'], 'version': root['version']}))
        rendered = self.response(self.visitor.request('index.php?page=' + root['slug'] + '&read=1')).decode()
        self.assertIn('absent.pdf', rendered)
        self.assertIn('Fichier à joindre', rendered)
        self.assertNotIn('Ignore this script', rendered)

    def test_invalid_archive_keeps_existing_pages_and_files(self):
        before = {p['id'] for p in self.response(self.admin.api('pages'))['pages']}
        initial_files = set((smoke.Integration.install / 'storage' / 'files').glob('*'))
        self.import_zip({'../outside.html': html('Unsafe','<p>Unsafe</p>')}, 400)
        self.import_zip({'a.html': html('A', '<p>A</p>'), 'b.html': html('B', '<p>B</p>')}, 400)
        self.import_zip({
            'root.html': html('Root', '<figure class="file"><a href="temp.txt">temp.txt</a></figure>'),
            'temp.txt': b'temporary',
            'root/Child.html': html('Child', '<p>text</p>' * 10500),
        }, 400)
        self.assertEqual(before, {p['id'] for p in self.response(self.admin.api('pages'))['pages']})
        self.assertEqual(initial_files, set((smoke.Integration.install / 'storage' / 'files').glob('*')))


if __name__ == '__main__':
    unittest.main(argv=[__file__, *smoke.REMAINING], verbosity=2)
