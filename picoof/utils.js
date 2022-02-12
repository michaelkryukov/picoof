module.exports.isObject = (value) => {
  const type = typeof value;
  return (
    value != null
    && value.constructor === Object
    && (type === 'object' || type === 'function')
  );
};

module.exports.readString = (stream) => {
  const chunks = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

module.exports.toBoolean = (value) => Boolean(value);

module.exports.handleSearchParams = (searchParams) => {
  const result = {};

  for (const key of searchParams.keys()) {
    if (key.startsWith('$')) {
      continue;
    }

    if (key.endsWith('[]')) {
      result[key] = searchParams.getAll(key);
    } else {
      result[key] = searchParams.get(key);
    }
  }

  return result;
};

module.exports.log = (message) => {
  const timestamp = new Date().toLocaleString().replace(',', '');
  console.log(`[${timestamp}] ${message})`);
};
