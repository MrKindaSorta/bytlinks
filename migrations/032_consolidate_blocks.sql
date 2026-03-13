-- booking → calendar
UPDATE content_blocks SET block_type = 'calendar',
  data = json_set(json_remove(data, '$.booking_url'), '$.url', json_extract(data, '$.booking_url'), '$.mode', 'book')
WHERE block_type = 'booking';

UPDATE content_blocks SET block_type = 'calendar',
  data = json_set(json_remove(data, '$.calendar_url'), '$.url', json_extract(data, '$.calendar_url'), '$.mode', 'view')
WHERE block_type = 'schedule';

-- embed → media-embed
UPDATE content_blocks SET block_type = 'media-embed',
  data = json_set(json_remove(json_remove(data, '$.embed_url'), '$.embed_type'),
    '$.url', json_extract(data, '$.embed_url'),
    '$.platform', json_extract(data, '$.embed_type'))
WHERE block_type = 'embed';

-- social-post → media-embed
UPDATE content_blocks SET block_type = 'media-embed',
  data = json_set(json_remove(data, '$.post_url'), '$.url', json_extract(data, '$.post_url'))
WHERE block_type = 'social-post';
