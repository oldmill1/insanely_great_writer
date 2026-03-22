class VirtualFilesystem
  ROOT_PATH = "root".freeze

  class << self
    def root_children_for(user)
      children_for(user, ROOT_PATH)
    end

    def children_for(user, parent_path)
      normalized_parent = normalize_parent_path(parent_path)
      folders = user.folders.active.where(path: direct_child_paths_for(Folder, user, normalized_parent)).order(:name)
      documents = user.documents.active.where(path: direct_child_paths_for(Document, user, normalized_parent)).order(:title)

      { folders:, documents: }
    end

    def build_path(parent_path, name)
      "#{normalize_parent_path(parent_path)}/#{normalize_name(name)}"
    end

    def parent_path_for(path)
      normalized_path = path.to_s.strip
      return ROOT_PATH if normalized_path.blank? || normalized_path == ROOT_PATH

      segments = normalized_path.split("/")
      return ROOT_PATH if segments.length <= 2

      segments[0..-2].join("/")
    end

    def next_folder_name(user:, parent_path:)
      next_name_for(scope: user.folders.active, parent_path:, base_name: Folder::FALLBACK_NAME, column: :name)
    end

    def next_document_title(user:, parent_path:)
      next_name_for(scope: user.documents.active, parent_path:, base_name: Document::FALLBACK_TITLE, column: :title)
    end

    def root_path
      ROOT_PATH
    end

    def normalize_parent_path(parent_path)
      value = parent_path.to_s.strip
      value.present? ? value : ROOT_PATH
    end

    private

    def direct_child_paths_for(model, user, parent_path)
      prefix = "#{parent_path}/"
      model.where(user:)
        .where("path LIKE ?", "#{prefix}%")
        .pluck(:path)
        .select { |path| parent_path_for(path) == parent_path }
    end

    def next_name_for(scope:, parent_path:, base_name:, column:)
      parent = normalize_parent_path(parent_path)
      names = scope
        .where("path LIKE ?", "#{parent}/%")
        .pluck(column, :path)
        .select { |(_, path)| parent_path_for(path) == parent }
        .map(&:first)

      return base_name unless names.include?(base_name)

      index = 2
      loop do
        candidate = "#{base_name} #{index}"
        return candidate unless names.include?(candidate)

        index += 1
      end
    end

    def normalize_name(name)
      name.to_s.strip
    end
  end
end
