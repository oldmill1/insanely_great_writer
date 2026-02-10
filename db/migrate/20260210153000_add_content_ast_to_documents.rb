class AddContentAstToDocuments < ActiveRecord::Migration[8.1]
  def change
    add_column :documents, :content_ast, :json, null: false, default: {}
  end
end
