import { vi } from "vitest";

// Fake Cloudinary + Supabase clients for the upload routes. No network.
// Tests change the vi.fn() behaviour per case; resetUploadFakes() restores defaults.

export const cloudinaryFake = {
  uploadOptions: [],
  // (options) => { error, result } decides what the upload stream callback gets.
  uploadResult: vi.fn(),
  config: vi.fn(),
  sign: vi.fn(),
};

export const supabaseFake = {
  buckets: [],
  createSignedUploadUrl: vi.fn(),
  getPublicUrl: vi.fn(),
};

export function resetUploadFakes() {
  cloudinaryFake.uploadOptions.length = 0;
  cloudinaryFake.uploadResult.mockReset();
  cloudinaryFake.uploadResult.mockImplementation((options) => ({
    error: null,
    result: {
      public_id: "westforce/portfolios/fake-id",
      secure_url: "https://res.cloudinary.example/fake-id",
      resource_type: options.resource_type,
      format: "png",
      bytes: 1234,
    },
  }));
  cloudinaryFake.config.mockReset();
  cloudinaryFake.config.mockReturnValue({
    cloud_name: "fake-cloud",
    api_key: "fake-api-key",
    api_secret: "fake-api-secret",
  });
  cloudinaryFake.sign.mockReset();
  cloudinaryFake.sign.mockReturnValue("fake-signature");

  supabaseFake.buckets.length = 0;
  supabaseFake.createSignedUploadUrl.mockReset();
  supabaseFake.createSignedUploadUrl.mockResolvedValue({
    data: { token: "fake-upload-token" },
    error: null,
  });
  supabaseFake.getPublicUrl.mockReset();
  supabaseFake.getPublicUrl.mockImplementation((path) => ({
    data: { publicUrl: `https://fake.supabase.example/public/${path}` },
  }));
}

function fakeCloudinary() {
  return {
    config: (...args) => cloudinaryFake.config(...args),
    utils: { api_sign_request: (...args) => cloudinaryFake.sign(...args) },
    uploader: {
      upload_stream(options, callback) {
        cloudinaryFake.uploadOptions.push(options);
        return {
          on() {},
          end() {
            const { error, result } = cloudinaryFake.uploadResult(options);
            setImmediate(() => callback(error, result));
          },
        };
      },
    },
  };
}

function fakeSupabase() {
  return {
    storage: {
      from(bucket) {
        supabaseFake.buckets.push(bucket);
        return {
          createSignedUploadUrl: (...args) => supabaseFake.createSignedUploadUrl(...args),
          getPublicUrl: (...args) => supabaseFake.getPublicUrl(...args),
        };
      },
    },
  };
}

// Replace lib/clients/{cloudinary,supabase} before the app loads.
export function mockUploadClients() {
  resetUploadFakes();
  vi.doMock("../../src/lib/clients/cloudinary", () => ({ default: fakeCloudinary() }));
  vi.doMock("../../src/lib/clients/supabase", () => ({ default: fakeSupabase() }));
}
