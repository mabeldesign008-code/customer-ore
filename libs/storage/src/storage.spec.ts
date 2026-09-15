import { LocalStorageDriver } from './local';
import { storageKeyFor } from './types';

describe('local storage driver (doc §Media, dev mode)', () => {
  it('writes and reads back objects', async () => {
    const d = new LocalStorageDriver('/tmp/ore-storage-test');
    const key = storageKeyFor('vendor-app', 'app-1', 'licence.pdf');
    await d.putObject(key, Buffer.from('hello'), 'application/pdf');
    expect(d.readObject(key).toString()).toBe('hello');
    expect(d.getObjectUrl(key)).toBe(`/media/${key}`);
  });

  it('creates a local upload endpoint reference', async () => {
    const d = new LocalStorageDriver('/tmp/ore-storage-test');
    const up = await d.createPresignedUpload('app-2/nid.png', 'image/png');
    expect(up.url).toBe('/media/upload');
    expect(up.headers['x-ore-key']).toBe('app-2/nid.png');
  });

  it('deletes objects', async () => {
    const d = new LocalStorageDriver('/tmp/ore-storage-test');
    const key = 'delete-me.txt';
    await d.putObject(key, 'x');
    await d.deleteObject(key);
    expect(() => d.readObject(key)).toThrow();
  });
});
