module VirtualPathItem
  extend ActiveSupport::Concern

  included do
    validates :path, presence: true, uniqueness: true
  end

  def parent_path
    VirtualFilesystem.parent_path_for(path)
  end

  def root_level?
    parent_path == VirtualFilesystem::ROOT_PATH
  end
end
