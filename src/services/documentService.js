export async function uploadDocument(
  file
) {
  return {
    success: true,

    document: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  };
}