#!/usr/bin/env python3
"""End-to-end checks for the private wheel library and automatic row timestamps."""
import json
import unittest
import uuid

import smoke as harness

CREATED = 'feuillet-created-at'


class WheelWorkspace(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        harness.Integration.setUpClass()
        cls.admin = harness.Integration.admin
        cls.visitor = harness.Integration.visitor

    @classmethod
    def tearDownClass(cls):
        harness.Integration.tearDownClass()

    def ok(self, result, status=200):
        self.assertEqual(result[0], status, result[1])
        return result[1]

    def wheel(self, **kwargs):
        return self.ok(self.admin.api('wheel_save', {'name': 'Oral du TP', **kwargs}))['wheel']

    def state(self, wheel):
        return self.ok(self.admin.api('wheel_state', {'saved_id': wheel['id']}))

    def rows(self):
        db = self.ok(self.admin.api('db_create', {'name': 'Projets'}))['database']
        props = self.ok(self.admin.api('db_get', query='&id='+db['id']))['properties']
        prop = next(p['id'] for p in props if p['type'] == 'title')
        return db, prop

    def test_manual_draw_folder_resume_and_access(self):
        route = self.visitor.request('rouedudestin')
        self.assertEqual(route[0], 200)
        self.assertIn(b'data-wheel-workspace="1"', route[1])
        self.assertIn('no-store', route[2]['Cache-Control'])
        self.ok(self.visitor.api('wheel_workspace'), 401)
        self.ok(self.admin.api('wheel_save', {'name': 'CSRF'}, authenticated=False), 403)
        folder = self.ok(self.admin.api('wheel_folder_save', {'name': 'TP'}))['folder']
        wheel = self.wheel(folder=folder['id'], manual=[{'id': str(uuid.uuid4()), 'label': 'Groupe A'}])
        self.ok(self.admin.api('wheel_folder_delete', {'id': folder['id'], 'version': folder['version']}), 409)
        scope = {'saved_id': wheel['id']}
        self.ok(self.visitor.api('wheel_state', scope), 401)
        current = self.state(wheel)
        draw = self.ok(self.admin.api('wheel_spin', {**scope, 'revision': current['state']['revision']}))
        self.ok(self.admin.api('wheel_spin', {**scope, 'revision': current['state']['revision']}), 409)
        self.assertEqual(self.state(wheel)['state']['pending'], draw['state']['pending'])
        pending = draw['state']['pending']
        done = self.ok(self.admin.api('wheel_decide', {**scope, 'revision': draw['state']['revision'], 'drawId': pending['drawId'], 'decision': 'remove'}))
        self.assertEqual(done['entries'], [])
        updated = self.wheel(id=wheel['id'], version=wheel['version'], manual=wheel['manual'])
        self.assertEqual(self.state(updated)['state']['excluded'], [pending['id']])
        self.ok(self.admin.api('wheel_save', {'id': wheel['id'], 'version': wheel['version'], 'name': 'Conflit'}), 409)
        self.assertEqual(self.state(updated)['state']['history'][0]['decision'], 'remove')
        self.ok(self.admin.api('wheel_folder_delete', {'id': folder['id'], 'version': folder['version']}))
        self.assertNotIn(b'Oral du TP', self.visitor.request('rouedudestin')[1])

    def test_live_link_overrides_and_timestamp(self):
        db, prop = self.rows()
        row = self.ok(self.admin.api('row_save', {'db_id': db['id'], 'values': {prop: 'Nom de la base'}}))['row']
        self.assertEqual(row['created_at'], row['derived'][CREATED])
        self.ok(self.admin.api('row_patch', {'id': row['id'], 'version': row['version'], 'property_id': CREATED, 'value': '2000-01-01T00:00:00Z'}), 400)
        self.ok(self.admin.api('form_save', {'db_id': db['id'], 'fields': [CREATED]}), 400)
        self.ok(self.visitor.api('wheel_source_preview', query=f'&id={db["id"]}&property={prop}'), 401)
        wheel = self.wheel(database=db['id'], property=prop, overrides={row['id']: {'label': 'Nom sur la roue', 'hidden': False}})
        other = self.ok(self.admin.api('row_save', {'db_id': db['id'], 'values': {prop: 'Arrivé après'}}))['row']
        self.assertEqual({e['label'] for e in self.state(wheel)['entries']}, {'Nom sur la roue', 'Arrivé après'})
        data = self.ok(self.admin.api('db_get', query='&id='+db['id']))
        self.assertEqual(next(r for r in data['rows'] if r['id'] == row['id'])['values'][prop], 'Nom de la base')
        self.assertEqual(self.state(self.wheel(database=db['id'], property=CREATED))['total'], 2)
        projection = self.ok(self.admin.api('db_projection', query=f'&id={db["id"]}&group={CREATED}&columns={CREATED}'))
        self.assertTrue(all(r['values'][CREATED] == r['groupValue'] == r['created_at'] for r in projection['rows']))
        csv = self.ok(self.admin.api('db_export', query='&id='+db['id'])).decode()
        self.assertIn('Ajouté le', csv)
        self.assertIn(row['created_at'], csv)
        self.ok(self.admin.api('db_delete', {'id': db['id'], 'version': db['version']}))
        self.assertTrue(self.state(wheel)['warning'])


if __name__ == '__main__':
    unittest.main(argv=[__file__]+harness.REMAINING, verbosity=2)
